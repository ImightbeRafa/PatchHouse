import { buildCatalog, readConfig, SHIPPING_COST } from '../../shared/catalog.js';

export { SHIPPING_COST };

/** Server-side catalog. Runtime sold-out/price settings come from env (same names as the frontend). */
export const catalog = buildCatalog(readConfig(process.env));
export const PRODUCTS = catalog.products;
export const isSoldOut = (key) => catalog.isSoldOut(key);

function toQty(value) {
  const qty = Number.parseInt(value, 10);
  return Number.isFinite(qty) && qty > 0 ? qty : 0;
}

/** Raw [{key, qty}] (from the client or from decoded returnData) -> trusted priced lines. */
export function getTrustedOrderItems(order = {}) {
  const raw = Array.isArray(order.items)
    ? order.items
    : order.producto
      ? [{ key: order.producto, qty: order.cantidad || 1 }]
      : [];
  return catalog.priceOrder(raw.map((i) => ({ key: i && i.key, qty: toQty(i && i.qty) }))).items;
}

/** Re-prices an order from the catalog. Client-supplied prices/totals are ignored. */
export function normalizeTrustedOrder(order = {}) {
  const priced = catalog.priceOrder(
    (Array.isArray(order.items) ? order.items : []).map((i) => ({ key: i && i.key, qty: toQty(i && i.qty) }))
  );
  return {
    ...order,
    items: priced.items,
    subtotal: priced.subtotal,
    shippingCost: priced.shipping,
    total: priced.total,
    savings: priced.savings
  };
}

export function findOrderTotalMismatch(order = {}) {
  const normalized = normalizeTrustedOrder(order);
  const mismatches = [];
  const check = (label, supplied, trusted) => {
    const n = Number(supplied);
    if (Number.isFinite(n) && n !== trusted) mismatches.push(`${label} supplied=${n} trusted=${trusted}`);
  };
  check('subtotal', order.subtotal, normalized.subtotal);
  check('shipping', order.shippingCost, normalized.shippingCost);
  check('total', order.total, normalized.total);
  return { normalized, mismatches };
}
