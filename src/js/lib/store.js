/**
 * Catalog + cart store (browser).
 *
 * The cart lives in localStorage so it survives navigation between pages and reloads.
 * It is validated against the catalog on every load (unknown/sold-out items are dropped,
 * quantities clamped). Prices are only ever DISPLAYED from here; the API re-prices orders.
 */
import { buildCatalog, readConfig, MAX_QTY_PER_LINE } from '../../../shared/catalog.js';

export const catalog = buildCatalog(readConfig(import.meta.env));

const KEY = 'ph_cart_v2';
const listeners = new Set();
let lines = {};

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode / quota: cart still works in memory */ }
}
export { safeGet as storageGet, safeSet as storageSet };

function sanitize(raw) {
  const clean = {};
  if (!raw || typeof raw !== 'object') return clean;
  for (const [key, qty] of Object.entries(raw)) {
    const n = Math.min(MAX_QTY_PER_LINE, Math.floor(Number(qty)));
    if (catalog.products[key] && !catalog.isSoldOut(key) && n > 0) clean[key] = n;
  }
  return clean;
}

function load() {
  try { lines = sanitize(JSON.parse(safeGet(KEY) || '{}')); } catch { lines = {}; }
}

function persist() {
  safeSet(KEY, JSON.stringify(lines));
  listeners.forEach((fn) => fn(cart));
}

load();
// Keep tabs in sync (e.g. checkout open in one tab, shopping in another).
window.addEventListener('storage', (e) => {
  if (e.key === KEY) { load(); listeners.forEach((fn) => fn(cart)); }
});

export const cart = {
  /** [{key, qty}] */
  items: () => Object.entries(lines).map(([key, qty]) => ({ key, qty })),
  count: () => Object.values(lines).reduce((n, q) => n + q, 0),
  qty: (key) => lines[key] || 0,
  /** Priced snapshot: {items, subtotal, shipping, total, savings}. */
  summary: () => catalog.priceOrder(cart.items()),
  add(key, qty = 1) {
    if (!catalog.products[key] || catalog.isSoldOut(key)) return false;
    lines[key] = Math.min(MAX_QTY_PER_LINE, (lines[key] || 0) + Math.max(1, Math.floor(qty)));
    persist();
    return true;
  },
  setQty(key, qty) {
    const n = Math.min(MAX_QTY_PER_LINE, Math.floor(qty));
    if (!(n > 0)) delete lines[key];
    else if (catalog.products[key]) lines[key] = n;
    persist();
  },
  remove(key) { delete lines[key]; persist(); },
  clear() { lines = {}; persist(); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
};

/** Product image for cart rows (combos show the first included patch). */
export function thumbOf(key) {
  const p = catalog.products[key];
  return p ? `/images/${p.image}-thumb.webp` : '';
}
