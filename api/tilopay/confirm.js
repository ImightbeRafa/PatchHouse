import { sendPaymentProcessingAlert } from '../utils/email.js';
import { processPaidOrder } from '../utils/fulfillment.js';
import { decodeReturnData, findOrderTotalMismatch } from '../utils/order.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { return res.status(405).json({ error: 'Method not allowed' }); }

  console.log('[Confirm] Tilopay redirect confirmation received');

  try {
    const { orderId, transactionId, code, returnData, orderHash } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID required' });
    }

    const isPaymentApproved = code === '1' || code === 1 || String(code) === '1';
    if (!isPaymentApproved) {
      console.log(`[Confirm] Redirect declined for order ${orderId}, code: ${code}`);
      return res.status(400).json({
        success: false,
        error: 'Payment declined',
        message: 'Payment was not approved by Tilopay redirect parameters',
        code
      });
    }

    if (!returnData) {
      await sendPaymentProcessingAlert({
        reason: 'Approved Tilopay redirect missing returnData',
        orderId,
        transactionId,
        source: 'redirect-confirm',
        payload: req.body
      }).catch(() => {});

      return res.status(422).json({
        success: false,
        error: 'Approved payment missing order data',
        message: 'Tilopay approved the payment, but no order data was returned. Admin has been alerted.'
      });
    }

    let order;
    try {
      order = decodeReturnData(returnData);
    } catch (decodeError) {
      await sendPaymentProcessingAlert({
        reason: 'Approved Tilopay redirect had invalid returnData',
        orderId,
        transactionId,
        source: 'redirect-confirm',
        payload: { error: decodeError.message, body: req.body }
      }).catch(() => {});

      return res.status(400).json({
        success: false,
        error: 'Invalid order data',
        message: 'Could not decode order information'
      });
    }

    const { mismatches } = findOrderTotalMismatch(order);
    if (mismatches.length > 0) {
      console.warn(`[Confirm] Correcting untrusted redirect totals for order ${orderId}: ${mismatches.join('; ')}`);
    }

    const result = await processPaidOrder({
      order: { ...order, orderId: order.orderId || orderId, orderHash },
      transactionId,
      req,
      source: 'redirect-confirm'
    });

    if (!result.success) {
      return res.status(502).json({
        success: false,
        error: result.error || 'Paid order processing failed',
        orderId,
        results: result.results
      });
    }

    return res.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed || false,
      message: 'Payment approved and order processing completed',
      orderId,
      results: result.results
    });
  } catch (error) {
    console.error('[Confirm] Error:', error);
    return res.status(500).json({ success: false, error: 'Confirmation failed', message: error.message });
  }
}
