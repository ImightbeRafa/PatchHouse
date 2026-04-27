import { sendOrderEmail } from '../utils/email.js';
import { sendOrderToBetsyWithRetry } from '../utils/betsy.js';
import { sendMetaEvent, generateEventId } from '../utils/meta.js';
import { decodeReturnData, findOrderTotalMismatch, normalizeTrustedOrder } from '../utils/order.js';
import crypto from 'crypto';

const processedWebhooks = new Set();

function verifyWebhookSignature(req) {
  const expectedSecret = process.env.TILOPAY_WEBHOOK_SECRET || '';
  if (!expectedSecret) {
    if (process.env.TILOPAY_ALLOW_UNSIGNED_WEBHOOKS === 'true') {
      console.warn('[Webhook] TILOPAY_WEBHOOK_SECRET missing; unsigned webhooks allowed by env override');
      return true;
    }
    console.error('[Webhook] TILOPAY_WEBHOOK_SECRET not configured; refusing to process payment webhook');
    return false;
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

    let order = null;
    const returnData = payload.returnData || payload.return_data;
    if (returnData) {
      try {
        order = decodeReturnData(returnData);
        const { normalized, mismatches } = findOrderTotalMismatch(order);
        if (mismatches.length > 0) {
          console.warn(`[Webhook] Corrected untrusted order totals for ${orderId}: ${mismatches.join('; ')}`);
        }
        order = normalized;
      } catch (e) {
        console.warn(`⚠️ [Webhook] Could not decode returnData: ${e.message}`);
      }
    }

    if (!order) {
      console.error(`[Webhook] Approved payment ${orderId} did not include returnData; not sending order email`);
      return res.status(422).json({ success: false, orderId, error: 'Approved payment missing returnData', webhookId });
    }

    order = normalizeTrustedOrder(order);
    if (!order.nombre || !order.email || !order.telefono || !order.total || !Array.isArray(order.items) || order.items.length === 0) {
      console.error(`[Webhook] Approved payment ${orderId} missing complete trusted order data; not sending order email`);
      return res.status(422).json({ success: false, orderId, error: 'Incomplete trusted order data', webhookId });
    }

    order.paymentStatus = 'completed';
    order.paymentId = transactionId;
    order.paymentMethod = 'Tilopay';
    order.paidAt = new Date().toISOString();

    let betsyResult;
    try {
      betsyResult = await sendOrderToBetsyWithRetry({ ...order, paymentMethod: 'Tilopay', transactionId });
    } catch (betsyError) {
      console.error(`❌ [Webhook] Failed to sync to Betsy CRM:`, betsyError);
      return res.status(502).json({ success: false, orderId, error: 'Betsy CRM sync failed', webhookId });
    }

    if (!betsyResult || !betsyResult.success) {
      console.error(`[Webhook] Betsy CRM sync failed for ${orderId}: ${betsyResult?.error || 'unknown error'}`);
      return res.status(502).json({ success: false, orderId, error: 'Betsy CRM sync failed', webhookId });
    }

    try {
      await sendOrderEmail(order);
    } catch (emailError) {
      console.error(`❌ [Webhook] Failed to send email:`, emailError);
      return res.status(502).json({ success: false, orderId, error: 'Order email failed', webhookId });
    }

    processedWebhooks.add(dedupeKey);

    const appUrl = (process.env.APP_URL || 'https://patchhouse.shopping').replace(/\/+$/, '');
    const metaEventId = generateEventId('purchase', orderId, transactionId);
    const contentIds = (order.items || []).map(i => i.key).filter(Boolean);
    const numItems = (order.items || []).reduce((sum, i) => sum + (parseInt(i.qty, 10) || 0), 0);
    await sendMetaEvent('Purchase', metaEventId, order, req, {
      value: order.total || 0,
      currency: 'CRC',
      content_ids: contentIds,
      content_type: 'product',
      num_items: numItems
    }, `${appUrl}/success.html`).catch(() => {});

    return res.json({ success: true, orderId, message: 'Payment confirmed and order processed via webhook', webhookId });

  } catch (error) {
    console.error(`❌ [Webhook] Error [${webhookId}]:`, error);
    return res.status(500).json({ error: 'Webhook processing failed', message: error.message, webhookId });
  }
}
