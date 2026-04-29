import { sendOrderEmail, sendPaymentProcessingAlert } from './email.js';
import { sendOrderToBetsyWithRetry } from './betsy.js';
import { sendMetaEvent, generateEventId } from './meta.js';
import { normalizeTrustedOrder } from './order.js';

const processedPayments = new Set();

function getPaymentKey(orderId, transactionId) {
  return `${orderId || ''}_${transactionId || ''}`;
}

function validatePaidOrder(order) {
  const missing = [];
  if (!order.orderId) missing.push('orderId');
  if (!order.nombre) missing.push('nombre');
  if (!order.telefono) missing.push('telefono');
  if (!order.email) missing.push('email');
  if (!order.provincia) missing.push('provincia');
  if (!order.canton) missing.push('canton');
  if (!order.distrito) missing.push('distrito');
  if (!order.direccion) missing.push('direccion');
  if (!Array.isArray(order.items) || order.items.length === 0) missing.push('items');
  if (!order.total) missing.push('total');
  return missing;
}

export async function processPaidOrder({ order, transactionId, req, source = 'unknown' }) {
  const normalized = normalizeTrustedOrder(order);
  const key = getPaymentKey(normalized.orderId, transactionId);

  if (processedPayments.has(key)) {
    return {
      success: true,
      alreadyProcessed: true,
      order: normalized,
      results: {}
    };
  }

  const missing = validatePaidOrder(normalized);
  if (missing.length > 0) {
    await sendPaymentProcessingAlert({
      reason: `Paid order missing required fields: ${missing.join(', ')}`,
      orderId: normalized.orderId,
      transactionId,
      source,
      payload: normalized
    }).catch(() => {});
    return {
      success: false,
      error: 'Incomplete paid order data',
      missing,
      order: normalized,
      results: {}
    };
  }

  const paidOrder = {
    ...normalized,
    paymentStatus: 'completed',
    paymentId: transactionId,
    paymentMethod: 'Tilopay',
    paidAt: new Date().toISOString()
  };

  const results = {
    betsy: { success: false },
    email: { success: false },
    meta: { success: false }
  };

  try {
    results.betsy = await sendOrderToBetsyWithRetry({ ...paidOrder, transactionId });
  } catch (error) {
    results.betsy = { success: false, error: error.message };
  }

  if (results.betsy.alreadyExists) {
    processedPayments.add(key);
    return {
      success: true,
      alreadyProcessed: true,
      order: paidOrder,
      results
    };
  }

  try {
    results.email = await sendOrderEmail(paidOrder);
  } catch (error) {
    results.email = { success: false, error: error.message };
  }

  const appUrl = (process.env.APP_URL || 'https://patchhouse.shopping').replace(/\/+$/, '');
  const metaEventId = generateEventId('purchase', paidOrder.orderId, transactionId);
  const contentIds = (paidOrder.items || []).map(i => i.key).filter(Boolean);
  const numItems = (paidOrder.items || []).reduce((sum, i) => sum + (parseInt(i.qty, 10) || 0), 0);

  try {
    results.meta = await sendMetaEvent('Purchase', metaEventId, paidOrder, req, {
      value: paidOrder.total || 0,
      currency: 'CRC',
      content_ids: contentIds,
      content_type: 'product',
      num_items: numItems
    }, `${appUrl}/success.html`);
  } catch (error) {
    results.meta = { success: false, error: error.message };
  }

  if (!results.betsy.success || !results.email.success) {
    await sendPaymentProcessingAlert({
      reason: 'Paid order had downstream processing failures',
      orderId: paidOrder.orderId,
      transactionId,
      source,
      payload: results
    }).catch(() => {});
  }

  const hasOperationalRecord = Boolean(results.email.success || results.betsy.success);
  if (hasOperationalRecord) {
    processedPayments.add(key);
  }

  return {
    success: hasOperationalRecord,
    order: paidOrder,
    results
  };
}
