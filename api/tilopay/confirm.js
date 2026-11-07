/**
 * PatchHouse – Tilopay redirect confirmation (called by /success.html).
 *
 * The redirect query string is controlled by the browser, so `code=1` alone proves nothing.
 * An approved return is fulfilled only when our signed returnData verifies and Tilopay's
 * consult endpoint confirms the capture for that amount. OrderHash is logged, not a gate.
 * If consult is down or does not confirm the payment, the order is left PENDIENTE in Betsy
 * (metadata.paymentVerification) and the owner is alerted. No customer paid email in that case.
 */
import { sendPaymentProcessingAlert } from '../_lib/email.js';
import { processPaidOrder } from '../_lib/fulfillment.js';
import { sendOrderToBetsyWithRetry } from '../_lib/betsy.js';
import { normalizeTrustedOrder } from '../_lib/order.js';
import { verifyOrderToken } from '../_lib/sign.js';
import { purchaseEventId } from '../_lib/meta.js';
import { guardPost, parseBody, isDryRun } from '../_lib/http.js';
import { computeOrderHash, consultTilopayOrder, hasApprovedTilopayCapture, phpNumberFormat2 } from '../_lib/tilopay.js';

const REVIEW_STATUS = 'Pago tarjeta por verificar';
const reviewRecorded = new Set();

function logOrderHash({ orderHash, transactionId, order, auth }) {
  const received = String(orderHash || '').slice(0, 128);
  try {
    const computed = computeOrderHash({
      tpt: transactionId,
      orderNumber: order.orderId,
      amount: order.total,
      code: '1',
      auth,
      email: order.email
    });
    console.info('[Confirm] OrderHash', {
      orderNumber: order.orderId,
      amount: phpNumberFormat2(order.total),
      received,
      computed
    });
  } catch {
    console.info('[Confirm] OrderHash', {
      orderNumber: order.orderId,
      amount: Number.isFinite(Number(order.total)) ? phpNumberFormat2(order.total) : '',
      received,
      computed: ''
    });
  }
}

async function reviewApprovedOrder(order, transactionId, reason, { alert = true } = {}) {
  const key = String(order.orderId || '');
  if (key && reviewRecorded.has(key)) {
    return { status: 200, body: { success: true, alreadyProcessed: true, review: true } };
  }

  let result;
  if (isDryRun()) {
    result = { success: true, dryRun: true };
  } else {
    try {
      result = await sendOrderToBetsyWithRetry({
        ...order,
        cardReview: true,
        paymentMethod: 'Tilopay',
        paymentStatus: 'pending',
        paymentId: transactionId,
        transactionId
      });
    } catch (err) {
      result = { success: false, error: err.message };
    }
  }

  if (result.success && key) reviewRecorded.add(key);
  if (alert) {
    const detail = result.success
      ? reason
      : `${reason} Betsy review sync failed: ${result.error || 'unknown'}`;
    await sendPaymentProcessingAlert({
      reason: detail,
      orderId: order.orderId,
      transactionId,
      source: 'redirect-confirm',
      payload: { review: true, status: REVIEW_STATUS, betsy: result.success ? 'synced' : (result.error || 'failed') }
    }).catch(() => {});
  }

  if (result.success) {
    return { status: 200, body: { success: true, review: true, ...(result.dryRun ? { dryRun: true } : {}) } };
  }
  return { status: 502, body: { success: false, error: 'Paid order processing failed', orderId: order.orderId } };
}

export default async function handler(req, res) {
  if (!guardPost(req, res)) return;

  let approvedOrder = null;
  let transactionId;
  try {
    const body = parseBody(req);
    const { orderId, code, auth, returnData, orderHash } = body;
    transactionId = body.transactionId;
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
    approvedOrder = order;
    const summary = {
      orderId: order.orderId,
      total: order.total,
      items: order.items.map(({ key, name, qty, lineTotal }) => ({ key, name, qty, lineTotal })),
      metaEventId: purchaseEventId(order.orderId)
    };

    logOrderHash({ orderHash, transactionId, order, auth });

    if (!isDryRun()) {
      let rows;
      try {
        rows = await consultTilopayOrder(order.orderId, process.env, transactionId);
      } catch (err) {
        console.info('[Confirm] Tilopay consult unavailable', { orderNumber: order.orderId });
        const reviewed = await reviewApprovedOrder(
          order,
          transactionId,
          `Tilopay status check failed: ${err.message}`
        );
        return res.status(reviewed.status).json({ ...reviewed.body, pending: true, ...summary });
      }
      const approved = hasApprovedTilopayCapture(rows, snapshot.total);
      console.info('[Confirm] Tilopay consult', {
        orderNumber: order.orderId,
        approved,
        codes: rows.map((row) => row.code).join(',')
      });
      if (!approved) {
        const reviewed = await reviewApprovedOrder(
          order,
          transactionId,
          'Tilopay did not confirm an approved payment for the signed amount'
        );
        // The redirect said approved, but Tilopay did not. Do not tell the shopper it was paid.
        return res.status(reviewed.status).json({ ...reviewed.body, success: false, paid: false, ...summary });
      }
    }

    let result;
    try {
      result = await processPaidOrder({
        order: { ...order, orderHash },
        transactionId,
        req,
        source: 'redirect-approved'
      });
    } catch (err) {
      const reviewed = await reviewApprovedOrder(
        order,
        transactionId,
        `Approved Tilopay redirect failed during fulfilment: ${err.message}`
      );
      return res.status(reviewed.status).json({ ...reviewed.body, ...summary });
    }

    if (result.alreadyProcessed) {
      return res.json({ success: true, alreadyProcessed: true, ...summary });
    }
    if (result.success) {
      return res.json({ success: true, alreadyProcessed: false, ...summary });
    }
    if (result.missing?.length) {
      return res.status(502).json({ success: false, error: 'Incomplete paid order data', orderId: order.orderId });
    }

    // Paid fulfilment did not land an operational record. Fulfilment already alerted.
    const reviewed = await reviewApprovedOrder(
      order,
      transactionId,
      'Approved Tilopay redirect could not be fulfilled',
      { alert: false }
    );
    return res.status(reviewed.status).json({ ...reviewed.body, ...summary });
  } catch (error) {
    console.error('[Confirm] Error:', error.message);
    if (approvedOrder) {
      try {
        const reviewed = await reviewApprovedOrder(
          approvedOrder,
          transactionId,
          `Approved Tilopay redirect failed after verification: ${error.message}`
        );
        return res.status(reviewed.status).json({
          ...reviewed.body,
          orderId: approvedOrder.orderId,
          total: approvedOrder.total
        });
      } catch (reviewError) {
        console.error('[Confirm] Review sync failed:', reviewError.message);
      }
    }
    return res.status(500).json({ success: false, error: 'Confirmation failed' });
  }
}
