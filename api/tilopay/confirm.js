import { sendOrderEmail } from '../utils/email.js';
import { sendOrderToBetsyWithRetry } from '../utils/betsy.js';

const processedOrders = new Set();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { return res.status(405).json({ error: 'Method not allowed' }); }

  console.log('📨 [Confirm] Payment confirmation request');

  try {
    const { orderId, transactionId, code, returnData } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID required' });
    }
    if (!returnData) {
      return res.status(400).json({ error: 'Missing order data (returnData)' });
    }

    console.log(`📋 [Confirm] Order: ${orderId}, Transaction: ${transactionId}, Code: ${code}`);

    const dedupeKey = `${orderId}_${transactionId || ''}`;
    if (processedOrders.has(dedupeKey)) {
      console.log(`⚠️ [Confirm] Order ${orderId} already processed — skipping duplicate`);
      return res.json({ success: true, alreadyProcessed: true, message: 'Order already processed', orderId });
    }

    const isPaymentApproved = code === '1' || code === 1 || String(code) === '1';
    if (!isPaymentApproved) {
      console.log(`❌ [Confirm] Payment declined for order ${orderId}, code: ${code}`);
      return res.status(400).json({ success: false, error: 'Payment declined', message: 'Payment was not approved', code });
    }

    let order;
    try {
      const decodedData = Buffer.from(returnData, 'base64').toString('utf-8');
      order = JSON.parse(decodedData);
    } catch (decodeError) {
      console.error(`❌ [Confirm] Failed to decode returnData:`, decodeError);
      return res.status(400).json({ error: 'Invalid order data', message: 'Could not decode order information' });
    }

    if (!order.nombre || !order.email || !order.total) {
      return res.status(400).json({ error: 'Incomplete order data', message: 'Order is missing required fields' });
    }

    processedOrders.add(dedupeKey);

    order.paymentStatus = 'completed';
    order.paymentId = transactionId;
    order.paymentMethod = 'Tilopay';
    order.paidAt = new Date().toISOString();

    console.log(`✅ [Confirm] Order ${orderId} confirmed as paid`);

    try {
      await sendOrderEmail(order);
      console.log(`📧 [Confirm] Emails sent for order ${orderId}`);
    } catch (emailError) {
      console.error(`❌ [Confirm] Failed to send emails:`, emailError);
    }

    try {
      await sendOrderToBetsyWithRetry({ ...order, paymentMethod: 'Tilopay', transactionId });
      console.log(`✅ [Confirm] Order synced to Betsy CRM: ${orderId}`);
    } catch (betsyError) {
      console.error(`❌ [Confirm] Failed to sync order to Betsy CRM:`, betsyError);
    }

    return res.json({ success: true, message: 'Payment confirmed, emails sent, and order synced to CRM', orderId });

  } catch (error) {
    console.error(`❌ [Confirm] Error:`, error);
    return res.status(500).json({ error: 'Confirmation failed', message: error.message });
  }
}
