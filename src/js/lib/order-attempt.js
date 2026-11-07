/** Checkout order id. One id per payment attempt; a retry before success keeps that id. */
export const CLIENT_ORDER_KEY = 'ph_checkout_order';

const ORDER_ID_RE = /^ORD-\d{10,}-\d{4}$/;

export function clearClientOrderId(storage) {
  try { storage.removeItem(CLIENT_ORDER_KEY); } catch { /* private mode */ }
}

/**
 * Reuses the stored id only while the same attempt is still in progress
 * (same method, contact, cart and total). A new attempt gets a new id.
 */
export function clientOrderId(storage, { method, email, phone, items, total, now = Date.now, rand = Math.random } = {}) {
  const fingerprint = JSON.stringify({
    m: method || '',
    e: String(email || '').trim().toLowerCase(),
    p: String(phone || '').replace(/\D/g, ''),
    i: Array.isArray(items) ? items.map((item) => ({ key: item && item.key, qty: item && item.qty })) : [],
    t: total
  });
  try {
    const cur = JSON.parse(storage.getItem(CLIENT_ORDER_KEY) || 'null');
    if (cur && cur.fingerprint === fingerprint && ORDER_ID_RE.test(cur.orderId)) return cur.orderId;
  } catch { /* ignore a broken stored value */ }
  const orderId = `ORD-${now()}-${Math.floor(1000 + rand() * 9000)}`;
  try { storage.setItem(CLIENT_ORDER_KEY, JSON.stringify({ orderId, fingerprint })); } catch { /* private mode */ }
  return orderId;
}
