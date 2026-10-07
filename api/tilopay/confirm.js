/**
 * PatchHouse – Tilopay redirect confirmation (called by /success.html).
 *
 * The redirect query string is controlled by the browser, so `code=1` alone proves nothing.
 * The order is fulfilled here only when Tilopay's OrderHash verifies (HMAC with our API password,
 * see api/_lib/tilopay.js). Otherwise the admin gets a "pending" notice and the signed webhook
 * fulfils it. CRM 409 "already exists" de-duplicates redirect + webhook.
 */
import { sendPaymentProcessingAlert, sendPendingOrderEmail } from '../_lib/email.js';
import { processPaidOrder } from '../_lib/fulfillment.js';
import { normalizeTrustedOrder } from '../_lib/order.js';
import { verifyOrderToken } from '../_lib/sign.js';
import { purchaseEventId } from '../_lib/meta.js';
import { guardPost, parseBody, isDryRun } from '../_lib/http.js';
import { verifyTilopayRedirect } from '../_lib/tilopay.js';

export default async function handler(req, res) {
  if (!guardPost(req, res)) return;

  try {
    const { orderId, transactionId, code, auth, returnData, orderHash } = parseBody(req);
    if (!orderId) return res.status(400).json({ success: false, error: 'Order ID required' });

    if (String(code) !== '1') {
      return res.status(400).json({ success: false, error: 'Payment declined', code });
    }

    let snapshot;
    try {
      snapshot = verifyOrderToken(returnData);
    } catch (err) {
      await sendPaymentProcessingAlert({
        reason: `Approved Tilopay redirect with invalid or unsigned returnData: ${err.message}`,
        orderId, transactionId, source: 'redirect-confirm', payload: { code }
      }).catch(() => {});
      return res.status(400).json({ success: false, error: 'Invalid order data', message: 'No pudimos validar los datos de tu pedido. Escribinos por WhatsApp con tu número de orden.' });
    }

    const order = normalizeTrustedOrder({ ...snapshot, orderId: snapshot.orderId || orderId });
    // Use the amount actually sent to Tilopay (signed in the snapshot) in case prices changed since.
    if (Number.isFinite(snapshot.total) && snapshot.total > 0) order.total = snapshot.total;
    const summary = {
      orderId: order.orderId,
      total: order.total,
      items: order.items.map(({ key, name, qty, lineTotal }) => ({ key, name, qty, lineTotal })),
      metaEventId: purchaseEventId(order.orderId)
    };

    // Tilopay signs the redirect with an HMAC only it and we can compute (see api/_lib/tilopay.js).
    const verified = verifyTilopayRedirect({ orderHash, tpt: transactionId, orderNumber: order.orderId, amount: order.total, code, auth, email: order.email });
    if (verified || process.env.TILOPAY_REDIRECT_FULFILL === 'true') {
      const result = await processPaidOrder({
        order: { ...order, orderHash },
        transactionId, req, source: verified ? 'redirect-verified' : 'redirect-unverified'
      });
      if (!result.success) {
        return res.status(502).json({ success: false, error: result.error || 'Paid order processing failed', orderId });
      }
      return res.json({ success: true, alreadyProcessed: Boolean(result.alreadyProcessed), ...summary });
    }
    if (orderHash) console.warn(`[Confirm] OrderHash did not verify for ${order.orderId}; waiting for webhook`);

    if (isDryRun()) return res.json({ success: true, pending: true, dryRun: true, ...summary });

    // Default: wait for the signed webhook. Leave a trail for the admin in the meantime.
    await sendPendingOrderEmail(order, { transactionId }).catch((e) => console.warn('[Confirm] pending email failed:', e.message));
    return res.json({ success: true, pending: true, ...summary });
  } catch (error) {
    console.error('[Confirm] Error:', error.message);
    return res.status(500).json({ success: false, error: 'Confirmation failed' });
  }
}
