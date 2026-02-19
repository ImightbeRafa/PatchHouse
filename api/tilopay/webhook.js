import { sendOrderEmail } from '../utils/email.js';
import { sendOrderToBetsyWithRetry } from '../utils/betsy.js';
import crypto from 'crypto';

const processedWebhooks = new Set();

function verifyWebhookSignature(req) {
  const expectedSecret = process.env.TILOPAY_WEBHOOK_SECRET || '';
  if (!expectedSecret) {
    console.warn('⚠️ [Webhook] TILOPAY_WEBHOOK_SECRET not configured — skipping verification');
    return true;
  }

  const providedSecret = req.headers['x-tilopay-secret'] || '';
  if (providedSecret && providedSecret === expectedSecret) return true;

  const providedHash = req.headers['hash-tilopay'] || '';
  if (providedHash) {
    try {
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const computedHash = crypto.createHmac('sha256', expectedSecret).update(rawBody).digest('hex');
      if (crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(computedHash))) return true;
    } catch (e) {
      console.error('⚠️ [Webhook] HMAC verification error:', e.message);
    }
    return false;
  }

  return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-tilopay-secret, hash-tilopay');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method === 'GET') {
    return res.json({ status: 'ok', message: 'Tilopay webhook endpoint is active (PatchHouse)', timestamp: new Date().toISOString() });
  }

  if (req.method !== 'POST') { return res.status(405).json({ error: 'Method not allowed' }); }

  const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`📨 [Webhook] Received payment notification [${webhookId}]`);

  try {
    const payload = req.body;
    console.log(`📦 [Webhook] Payload:`, JSON.stringify(payload, null, 2));

    const isVerified = verifyWebhookSignature(req);
    if (!isVerified) {
      console.error(`❌ [Webhook] Signature verification FAILED [${webhookId}]`);
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const orderId = payload.order || payload.order_id || payload.orderNumber || payload.referencia || payload.reference;
    const transactionId = payload['tilopay-transaction'] || payload.tpt || payload.transaction_id || payload.transaccion_id || payload.id;
    const code = payload.code;
    const status = String(payload.estado || payload.status || '').toLowerCase();

    console.log(`🔍 [Webhook] Payment details - Order: ${orderId}, Code: ${code}, Status: ${status} [${webhookId}]`);

    if (!orderId) {
      return res.status(400).json({ error: 'No order ID' });
    }

    const dedupeKey = `${orderId}_${transactionId || ''}`;
    if (processedWebhooks.has(dedupeKey)) {
      return res.json({ success: true, message: 'Webhook already processed', alreadyProcessed: true });
    }

    const isCodeApproved = code === '1' || code === 1 || String(code) === '1';
    const isStatusApproved = ['aprobada', 'approved', 'success', 'paid', 'completed'].includes(status);
    const isSuccess = isCodeApproved || (isStatusApproved && code === undefined);

    if (!isSuccess) {
      const isDeclined = (code !== undefined && !isCodeApproved) ||
        ['rechazada', 'declined', 'failed', 'canceled', 'cancelled', 'rejected'].includes(status);

      if (isDeclined) {
        processedWebhooks.add(dedupeKey);
        return res.json({ success: true, orderId, message: 'Payment failed — order cancelled', paymentStatus: 'failed', webhookId });
      }

      return res.json({ success: true, orderId, message: 'Webhook received but status unknown', webhookId });
    }

    processedWebhooks.add(dedupeKey);

    let order = null;
    const returnData = payload.returnData || payload.return_data;
    if (returnData) {
      try {
        const decoded = Buffer.from(returnData, 'base64').toString('utf-8');
        order = JSON.parse(decoded);
      } catch (e) {
        console.warn(`⚠️ [Webhook] Could not decode returnData: ${e.message}`);
      }
    }

    if (!order) {
      return res.json({ success: true, orderId, message: 'Payment approved — order will be processed via redirect confirm', webhookId });
    }

    order.paymentStatus = 'completed';
    order.paymentId = transactionId;
    order.paymentMethod = 'Tilopay';
    order.paidAt = new Date().toISOString();

    try {
      await sendOrderEmail(order);
    } catch (emailError) {
      console.error(`❌ [Webhook] Failed to send email:`, emailError);
    }

    try {
      await sendOrderToBetsyWithRetry({ ...order, paymentMethod: 'Tilopay', transactionId });
    } catch (betsyError) {
      console.error(`❌ [Webhook] Failed to sync to Betsy CRM:`, betsyError);
    }

    return res.json({ success: true, orderId, message: 'Payment confirmed and order processed via webhook', webhookId });

  } catch (error) {
    console.error(`❌ [Webhook] Error [${webhookId}]:`, error);
    return res.status(500).json({ error: 'Webhook processing failed', message: error.message, webhookId });
  }
}
