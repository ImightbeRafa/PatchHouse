/**
 * PatchHouse – Tilopay redirect confirmation (called by /success.html).
 *
 * The redirect query string is controlled by the browser, so `code=1` alone proves nothing.
 * By default this endpoint only validates the signed order snapshot and tells the admin an
 * order is awaiting verification; fulfilment (CRM, emails, Purchase event) happens in the
 * signed webhook. Set TILOPAY_REDIRECT_FULFILL=true only if you cannot receive webhooks.
 */
import { sendPaymentProcessingAlert, sendPendingOrderEmail } from '../_lib/email.js';
import { processPaidOrder } from '../_lib/fulfillment.js';
import { normalizeTrustedOrder } from '../_lib/order.js';
import { verifyOrderToken } from '../_lib/sign.js';
import { generateEventId } from '../_lib/meta.js';
import { guardPost, parseBody, isDryRun } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!guardPost(req, res)) return;

  try {
    const { orderId, transactionId, code, returnData, orderHash } = parseBody(req);
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
    const summary = {
      orderId: order.orderId,
      total: order.total,
      items: order.items.map(({ key, name, qty, lineTotal }) => ({ key, name, qty, lineTotal })),
      metaEventId: generateEventId('purchase', order.orderId, transactionId)
    };

    if (process.env.TILOPAY_REDIRECT_FULFILL === 'true') {
      const result = await processPaidOrder({
        order: { ...order, orderHash },
        transactionId, req, source: 'redirect-confirm'
      });
      if (!result.success) {
        return res.status(502).json({ success: false, error: result.error || 'Paid order processing failed', orderId });
      }
      return res.json({ success: true, alreadyProcessed: Boolean(result.alreadyProcessed), ...summary });
    }

    if (isDryRun()) return res.json({ success: true, pending: true, dryRun: true, ...summary });

    // Default: wait for the signed webhook. Leave a trail for the admin in the meantime.
    await sendPendingOrderEmail(order, { transactionId }).catch((e) => console.warn('[Confirm] pending email failed:', e.message));
    return res.json({ success: true, pending: true, ...summary });
  } catch (error) {
    console.error('[Confirm] Error:', error.message);
    return res.status(500).json({ success: false, error: 'Confirmation failed' });
  }
}
