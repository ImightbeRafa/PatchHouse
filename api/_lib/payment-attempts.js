/**
 * Process-local record of order ids already sent to Tilopay.
 * SINPE must not reuse one: a declined card and a later SINPE transfer are different payments.
 */
import { newOrderId, ORDER_ID_RE } from './http.js';

const cardOrderIds = new Set();

export function rememberCardOrderId(orderId) {
  const id = String(orderId || '');
  if (ORDER_ID_RE.test(id)) cardOrderIds.add(id);
}

/** Keep a fresh SINPE id. Replace one that was already used for a card attempt. */
export function allocateSinpeOrderId(clientOrderId) {
  const id = String(clientOrderId || '');
  if (ORDER_ID_RE.test(id) && !cardOrderIds.has(id)) return id;
  return newOrderId();
}
