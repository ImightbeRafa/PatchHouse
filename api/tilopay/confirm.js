import { decodeReturnData, findOrderTotalMismatch } from '../utils/order.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { return res.status(405).json({ error: 'Method not allowed' }); }

  console.log('[Confirm] Browser redirect received');

  try {
    const { orderId, transactionId, code, returnData } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID required' });
    }

    const isPaymentApproved = code === '1' || code === 1 || String(code) === '1';
    if (!isPaymentApproved) {
      console.log(`[Confirm] Redirect declined for order ${orderId}, code: ${code}`);
      return res.status(400).json({
        success: false,
        error: 'Payment declined',
        message: 'Payment was not approved by redirect parameters',
        code
      });
    }

    if (returnData) {
      try {
        const order = decodeReturnData(returnData);
        const { mismatches } = findOrderTotalMismatch(order);
        if (mismatches.length > 0) {
          console.warn(`[Confirm] Ignoring untrusted redirect totals for order ${orderId}: ${mismatches.join('; ')}`);
        }
      } catch (decodeError) {
        console.warn(`[Confirm] Could not decode untrusted returnData for order ${orderId}: ${decodeError.message}`);
      }
    }

    console.log(`[Confirm] Order ${orderId} is waiting for server-side Tilopay webhook confirmation`);
    return res.status(202).json({
      success: false,
      pending: true,
      orderId,
      transactionId,
      message: 'Redirect received. Order will only be processed after the Tilopay server webhook confirms payment.'
    });
  } catch (error) {
    console.error('[Confirm] Error:', error);
    return res.status(500).json({ success: false, error: 'Confirmation failed', message: error.message });
  }
}
