/**
 * Loaded on every page: header menu, cart badge + drawer, add-to-cart buttons,
 * lazy vertical videos, tracking helpers.
 */
import { cart, catalog } from './lib/store.js';
import { $, $$, formatCRC, lineHtml, bindLineControls, toast, track, orderContents, esc } from './lib/ui.js';
import { FREE_SHIPPING_FROM } from '../../shared/catalog.js';

/* ---------- mobile menu ---------- */
const menuBtn = $('[data-menu-toggle]');
const nav = $('#primary-nav');
function setMenu(open) {
  if (!menuBtn || !nav) return;
  nav.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
}
menuBtn?.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav?.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });

/* ---------- cart badge ---------- */
const badges = $$('[data-cart-count]');
const cartBtn = $('[data-open-cart]');
let lastCount = cart.count();
function renderBadge() {
  const n = cart.count();
  badges.forEach((b) => { b.textContent = n > 99 ? '99+' : String(n); b.hidden = n === 0; });
  if (cartBtn) {
    cartBtn.setAttribute('aria-label', n ? `Abrir carrito, ${n} ${n === 1 ? 'artículo' : 'artículos'}` : 'Abrir carrito');
    if (n > lastCount) { cartBtn.classList.remove('bump'); void cartBtn.offsetWidth; cartBtn.classList.add('bump'); }
  }
  lastCount = n;
}

/* ---------- cart drawer ---------- */
const drawer = $('#cart-drawer');
const overlay = $('[data-overlay]');
const body = $('[data-cart-body]');
const foot = $('[data-cart-foot]');
let lastFocus = null;

/** "Te faltan ₡X para envío gratis" + progress bar (shared with the checkout summary). */
export function shippingProgress(subtotal) {
  const missing = FREE_SHIPPING_FROM - subtotal;
  const pct = Math.max(4, Math.min(100, Math.round((subtotal / FREE_SHIPPING_FROM) * 100)));
  const text = missing > 0
    ? `Te faltan <b>${formatCRC(missing)}</b> para <b>envío gratis</b>`
    : '<b>¡Tenés envío gratis!</b> 🎉';
  return `<div class="ship-progress${missing > 0 ? '' : ' done'}"><p>${text}</p><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div></div>`;
}

function renderDrawer() {
  if (!body || !foot) return;
  const s = cart.summary();
  if (!s.items.length) {
    body.innerHTML = `<div class="drawer-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 7h12l-1 12H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>
      <p>Tu carrito está vacío.</p><a class="btn btn-cta" href="/#tienda" data-close-cart>Ver los parches</a></div>`;
    foot.hidden = true;
    return;
  }
  body.innerHTML = s.items.map((l) => lineHtml(l, catalog.products[l.key], { compact: true })).join('') + addOnsHtml(s.items);
  foot.hidden = false;
  foot.innerHTML = `
    ${s.savings ? `<div class="drawer-total" style="font-size:14px;font-weight:700;color:var(--ok)"><span>Ahorrás</span><span>${formatCRC(s.savings)}</span></div>` : ''}
    <div class="drawer-total"><span>Subtotal</span><span>${formatCRC(s.subtotal)}</span></div>
    ${shippingProgress(s.subtotal)}
    <a class="btn btn-cta btn-lg btn-block" href="/checkout/">Finalizar compra</a>`;
}

/** "Completá tu rutina": patches not yet covered by the cart, then combos, max 3. */
function addOnsHtml(items) {
  const inCart = new Set(items.map((i) => i.key));
  const covered = new Set(items.flatMap((i) => catalog.products[i.key]?.includes || []));
  const patches = catalog.patches().filter((p) => !covered.has(p.key) && !catalog.isSoldOut(p.key));
  const combos = catalog.combos().filter((c) => !inCart.has(c.key) && !catalog.isSoldOut(c.key) && c.includes.some((k) => covered.has(k)));
  const picks = [...patches.slice(0, 2), ...combos.slice(0, 1), ...patches.slice(2)].slice(0, 3);
  if (!picks.length) return '';
  return `<section class="addons" aria-label="Agregá a tu pedido"><h3>Completá tu rutina</h3>${picks.map((p) => `
    <div class="addon">
      <img src="/images/${esc(p.cardImage || p.image)}-thumb.webp" alt="" width="56" height="56" loading="lazy">
      <div class="addon-main"><b>${esc(p.name)}</b><span>${p.kind === 'combo' ? `${formatCRC(p.price)} <s>${formatCRC(p.compareAt)}</s>` : formatCRC(p.price)}</span></div>
      <button class="btn btn-outline btn-sm" type="button" data-add="${esc(p.key)}" data-qty="1" aria-label="Agregar ${esc(p.name)} al carrito">+ Agregar</button>
    </div>`).join('')}</section>`;
}

function focusables() {
  return $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', drawer).filter((el) => !el.hidden && el.offsetParent !== null);
}

export function openCart() {
  if (!drawer) return;
  if (drawer.classList.contains('open')) { renderDrawer(); return; } // e.g. an add-on added from inside the drawer
  lastFocus = document.activeElement;
  renderDrawer();
  drawer.classList.add('open');
  overlay?.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  (focusables()[0] || drawer).focus?.();
}

export function closeCart() {
  if (!drawer || !drawer.classList.contains('open')) return;
  drawer.classList.remove('open');
  overlay?.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
  lastFocus?.focus?.();
}

document.addEventListener('keydown', (e) => {
  if (!drawer?.classList.contains('open')) return;
  if (e.key === 'Escape') { closeCart(); return; }
  if (e.key !== 'Tab') return;
  const els = focusables();
  if (!els.length) return;
  const first = els[0];
  const last = els[els.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

overlay?.addEventListener('click', closeCart);
drawer?.addEventListener('click', (e) => { if (e.target.closest('[data-close-cart]')) closeCart(); });
if (drawer && body) bindLineControls(body, cart);
cartBtn?.addEventListener('click', openCart);

cart.subscribe(() => {
  renderBadge();
  if (drawer?.classList.contains('open')) renderDrawer();
});
renderBadge();

/* ---------- add to cart (cards, PDP, combos) ---------- */
export function addToCart(key, qty = 1, { open = true } = {}) {
  const p = catalog.products[key];
  if (!p) return false;
  if (catalog.isSoldOut(key)) { toast(`${p.name} está agotado por ahora.`, { type: 'error' }); return false; }
  const before = cart.summary().subtotal;
  if (!cart.add(key, qty)) return false;
  track('AddToCart', { ...orderContents([{ key, qty }]), content_ids: [key], content_name: p.name, value: cart.summary().subtotal - before });
  if (open) openCart();
  return true;
}

document.addEventListener('click', (e) => {
  const add = e.target.closest('[data-add]');
  if (add && !add.closest('[data-no-core-add]')) {
    e.preventDefault();
    addToCart(add.dataset.add, Number(add.dataset.qty) || 1);
    return;
  }
  const buy = e.target.closest('[data-buy-now]');
  if (buy) {
    e.preventDefault();
    if (addToCart(buy.dataset.buyNow, Number(buy.dataset.qty) || 1, { open: false })) window.location.assign('/checkout/');
  }
});

/* ---------- vertical videos: poster when near, video when visible, muted autoplay, tap for sound ---------- */
function initReels() {
  const reels = $$('.reel video');
  if (!reels.length) return;
  const saveData = navigator.connection && navigator.connection.saveData;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Posters (~300 KB for six) stay out of the initial page load: set them as the carousel approaches.
  const showPoster = (v) => { if (!v.poster && v.dataset.poster) v.poster = v.dataset.poster; };
  if (!('IntersectionObserver' in window)) { reels.forEach(showPoster); return; }
  // Observe the carousel, not each video: reels off to the side are clipped by its scroller.
  const near = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => { if (isIntersecting) { $$('video', target).forEach(showPoster); near.unobserve(target); } });
  }, { rootMargin: '600px 0px' });
  $$('[data-reels]').forEach((el) => near.observe(el));

  const load = (v) => {
    showPoster(v);
    if (v.dataset.ready) return;
    v.dataset.ready = '1';
    v.src = v.dataset.src;
    v.load();
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target: v, isIntersecting }) => {
      if (isIntersecting) {
        if (saveData || reduce) return; // poster only; user can tap to play
        load(v);
        v.play().catch(() => {});
      } else if (!v.paused) {
        v.pause();
      }
    });
  }, { threshold: 0.6, rootMargin: '0px 100px 0px 100px' });
  reels.forEach((v) => io.observe(v));

  $$('.reel').forEach((fig) => {
    const v = $('video', fig);
    const sound = $('[data-sound]', fig);
    fig.addEventListener('click', (e) => {
      if (e.target.closest('[data-sound]')) return;
      load(v);
      if (v.paused) v.play().catch(() => {}); else v.pause();
    });
    sound?.addEventListener('click', () => {
      load(v);
      v.muted = !v.muted;
      sound.setAttribute('aria-pressed', String(!v.muted));
      sound.setAttribute('aria-label', v.muted ? 'Activar sonido' : 'Silenciar');
      if (!v.muted) {
        // only one video with sound at a time
        $$('.reel video').forEach((o) => { if (o !== v) { o.muted = true; } });
        $$('[data-sound]').forEach((b) => { if (b !== sound) b.setAttribute('aria-pressed', 'false'); });
        v.play().catch(() => {});
      }
    });
  });
}
initReels();

/* carousel arrows (desktop) */
$$('.reels-wrap').forEach((wrap) => {
  const track = $('[data-reels]', wrap);
  const prev = $('[data-reels-prev]', wrap);
  const next = $('[data-reels-next]', wrap);
  if (!track || !prev || !next) return;
  const step = () => (track.querySelector('.reel')?.getBoundingClientRect().width || 240) * 2;
  const sync = () => {
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  };
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  track.addEventListener('scroll', sync, { passive: true });
  // First measurement after the page has painted (reading layout during load forces a reflow).
  addEventListener('load', () => requestAnimationFrame(sync), { once: true });
});

/* ---------- legacy links: old single-page checkout anchor ---------- */
if (location.pathname === '/' && location.hash === '#pedido') location.replace('/checkout/');
