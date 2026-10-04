/** Product page: gallery, pack selector, live price, sticky buy bar, ViewContent. */
import './core.js';
import { catalog } from './lib/store.js';
import { $, $$, formatCRC, track } from './lib/ui.js';

const section = $('.pdp[data-product]');
const key = section?.dataset.product;
const product = key ? catalog.products[key] : null;

if (product) {
  track('ViewContent', { content_ids: [key], content_name: product.name, content_type: 'product', value: product.price, currency: 'CRC' });
}

/* ---------- gallery ---------- */
const gallery = $('[data-gallery]');
if (gallery) {
  const slides = $$('.slide', gallery);
  const thumbs = $$('.th', gallery);
  let index = 0;

  const show = (i, { focus = false } = {}) => {
    index = (i + slides.length) % slides.length;
    slides.forEach((s, n) => { const on = n === index; s.classList.toggle('on', on); s.hidden = !on; });
    thumbs.forEach((t, n) => {
      const on = n === index;
      t.classList.toggle('on', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on) {
        if (focus) t.focus();
        t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      }
    });
    // lazy images inside slides that were hidden
    $$('img[loading="lazy"]', slides[index]).forEach((img) => { img.loading = 'eager'; });
  };

  thumbs.forEach((t, n) => t.addEventListener('click', () => show(n)));
  $('[data-gal-prev]', gallery)?.addEventListener('click', () => show(index - 1));
  $('[data-gal-next]', gallery)?.addEventListener('click', () => show(index + 1));
  $('.thumbs', gallery)?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1, { focus: true }); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1, { focus: true }); }
  });

  // swipe
  const stage = $('.slides', gallery);
  let startX = null;
  let startY = null;
  stage?.addEventListener('pointerdown', (e) => { startX = e.clientX; startY = e.clientY; });
  stage?.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    startX = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) show(index + (dx < 0 ? 1 : -1));
  });
  stage?.addEventListener('pointercancel', () => { startX = null; });
  thumbs.forEach((t, n) => { t.tabIndex = n === 0 ? 0 : -1; });
}

/* ---------- selection: pack (patches) or quantity (combos) ---------- */
const atc = $('#atc');
const buyNow = $('[data-buy-now]');
const stickyBtn = $('[data-sticky-add]');
const priceEl = $('[data-price-box] .price');
const atcPrice = $('[data-atc-price]');
const stickyPrice = $('[data-sticky-price]');
let qty = 1;

function applySelection(total, compare, nextQty) {
  qty = nextQty;
  [atc, buyNow, stickyBtn].forEach((b) => { if (b) b.dataset.qty = String(qty); });
  if (atcPrice) atcPrice.textContent = formatCRC(total);
  if (stickyPrice) stickyPrice.textContent = formatCRC(total);
  if (priceEl) {
    const save = compare - total;
    priceEl.innerHTML = `<b>${formatCRC(total)}</b>${save > 0 ? `<s>${formatCRC(compare)}</s><em>Ahorrás ${formatCRC(save)}</em>` : ''}`;
  }
}

const packs = $$('input[name="pack"]');
if (packs.length) {
  const sync = () => {
    const sel = packs.find((p) => p.checked) || packs[0];
    packs.forEach((p) => p.closest('.pack')?.classList.toggle('on', p === sel));
    applySelection(Number(sel.dataset.price), Number(sel.dataset.compare), Number(sel.value));
  };
  packs.forEach((p) => p.addEventListener('change', sync));
  sync();
}

const qtyOut = $('[data-qty-out]');
if (qtyOut && product) {
  const minus = $('[data-qty-minus]');
  const plus = $('[data-qty-plus]');
  const sync = (n) => {
    n = Math.max(1, Math.min(10, n));
    qtyOut.textContent = String(n);
    minus.disabled = n <= 1;
    plus.disabled = n >= 10;
    applySelection(catalog.linePrice(key, n), catalog.lineCompare(key, n), n);
  };
  minus.addEventListener('click', () => sync(qty - 1));
  plus.addEventListener('click', () => sync(qty + 1));
  sync(1);
}

stickyBtn?.addEventListener('click', () => atc?.click());

/* ---------- sticky buy bar (appears when the main button leaves the screen) ---------- */
const sticky = $('[data-sticky]');
if (sticky && atc && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(([entry]) => {
    const pastIt = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    sticky.classList.toggle('show', pastIt);
    sticky.setAttribute('aria-hidden', String(!pastIt));
    if (stickyBtn) stickyBtn.tabIndex = pastIt ? 0 : -1;
    document.body.classList.toggle('has-sticky', pastIt);
  }, { threshold: 0 });
  io.observe(atc);
}
