/** Small DOM helpers shared across pages. */
import { formatCRC } from '../../../shared/catalog.js';

export { formatCRC };

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function toast(message, { type = 'info', action, timeout = 3500 } = {}) {
  const region = $('[data-toasts]');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast${type === 'error' ? ' error' : ''}`;
  const span = document.createElement('span');
  span.textContent = message;
  el.append(span);
  if (action) {
    const a = document.createElement('a');
    a.href = action.href;
    a.textContent = action.label;
    el.append(a);
  }
  region.append(el);
  setTimeout(() => el.remove(), timeout);
}

/** Quantity row used by the cart drawer and the checkout summary. */
export function lineHtml(line, product, { compact = false } = {}) {
  const compare = line.compareTotal > line.lineTotal ? `<s>${formatCRC(line.compareTotal)}</s>` : '';
  return `
<div class="line" data-line="${esc(line.key)}">
  <img src="/images/${esc(product.image)}-thumb.webp" alt="" width="72" height="72" loading="lazy">
  <div class="line-main">
    <div class="line-top">
      <a class="line-name" href="${esc(product.path)}">${esc(product.name)}</a>
      <span class="line-price">${formatCRC(line.lineTotal)}${compare}</span>
    </div>
    ${compact ? '' : `<span class="line-sub">${esc(product.unitLabel)}</span>`}
    <div class="line-actions">
      <div class="qty" role="group" aria-label="Cantidad de ${esc(product.name)}">
        <button type="button" aria-label="Reducir cantidad" data-qty-dec="${esc(line.key)}">−</button>
        <output>${line.qty}</output>
        <button type="button" aria-label="Aumentar cantidad" data-qty-inc="${esc(line.key)}"${line.qty >= 10 ? ' disabled' : ''}>+</button>
      </div>
      <button class="remove" type="button" data-remove="${esc(line.key)}">Quitar</button>
    </div>
  </div>
</div>`;
}

/** Delegated click handling for qty +/- and remove buttons inside `root`. */
export function bindLineControls(root, cart) {
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-qty-inc],[data-qty-dec],[data-remove]');
    if (!t || !root.contains(t)) return;
    // Re-rendering replaces the buttons: remember which one had focus and restore it afterwards.
    const sel = t.dataset.qtyInc ? `[data-qty-inc="${t.dataset.qtyInc}"]` : t.dataset.qtyDec ? `[data-qty-dec="${t.dataset.qtyDec}"]` : null;
    if (sel) queueMicrotask(() => { const next = root.querySelector(sel); if (next && !next.disabled) next.focus(); });
    if (t.dataset.qtyInc) cart.setQty(t.dataset.qtyInc, cart.qty(t.dataset.qtyInc) + 1);
    else if (t.dataset.qtyDec) cart.setQty(t.dataset.qtyDec, cart.qty(t.dataset.qtyDec) - 1);
    else if (t.dataset.remove) cart.remove(t.dataset.remove);
  });
}

export function track(name, params, options) {
  try {
    if (typeof window.fbq === 'function') {
      if (options) window.fbq('track', name, params, options);
      else if (params) window.fbq('track', name, params);
      else window.fbq('track', name);
    }
  } catch { /* tracking must never break the shop */ }
}

export function orderContents(items) {
  return { content_ids: items.map((i) => i.key), content_type: 'product', num_items: items.reduce((n, i) => n + i.qty, 0), currency: 'CRC' };
}
