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

/* ---------- selection: option (product alone or a combo) × quantity ---------- */
const atc = $('#atc');
const buyNow = $('[data-buy-now]');
const stickyBtn = $('[data-sticky-add]');
const priceEl = $('[data-price-box] .price');
const atcPrice = $('[data-atc-price]');
const stickyPrice = $('[data-sticky-price]');
const stickyName = $('[data-sticky] .sb-info b');
const qtyOut = $('[data-qty-out]');
const minus = $('[data-qty-minus]');
const plus = $('[data-qty-plus]');
const options = $$('input[name="opt"]');
let selected = key;
let qty = 1;

function render() {
  const total = catalog.linePrice(selected, qty);
  const compare = catalog.lineCompare(selected, qty);
  if (atc) { atc.dataset.add = selected; atc.dataset.qty = String(qty); }
  if (buyNow) { buyNow.dataset.buyNow = selected; buyNow.dataset.qty = String(qty); }
  if (atcPrice) atcPrice.textContent = formatCRC(total);
  if (stickyPrice) stickyPrice.textContent = formatCRC(total);
  if (stickyName) stickyName.textContent = catalog.products[selected]?.short || '';
  if (priceEl) {
    const save = compare - total;
    priceEl.innerHTML = `<b>${formatCRC(total)}</b>${save > 0 ? `<s>${formatCRC(compare)}</s><em>Ahorrás ${formatCRC(save)}</em>` : ''}`;
  }
  if (qtyOut) {
    qtyOut.textContent = String(qty);
    minus.disabled = qty <= 1;
    plus.disabled = qty >= 10;
  }
}

options.forEach((o) => o.addEventListener('change', () => {
  const sel = options.find((x) => x.checked);
  selected = sel ? sel.value : key;
  options.forEach((x) => x.closest('.opt')?.classList.toggle('on', x.checked));
  render();
}));
minus?.addEventListener('click', () => { qty = Math.max(1, qty - 1); render(); });
plus?.addEventListener('click', () => { qty = Math.min(10, qty + 1); render(); });
if (product) render();

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
