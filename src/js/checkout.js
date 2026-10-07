/**
 * Checkout: cart summary, inline validation, SINPE Móvil + card (Tilopay) submission.
 * The server re-validates and re-prices everything; this file only drives the UI.
 */
import { shippingProgress } from './core.js';
import { cart, catalog, storageGet, storageSet } from './lib/store.js';
import { $, $$, formatCRC, lineHtml, bindLineControls, track, orderContents, toast, metaIds, afterTracking } from './lib/ui.js';
import { validateCheckout, sanitizeCustomer, formatPhone } from '../../shared/validate.js';

const form = $('#checkout-form');
const grid = $('[data-checkout]');
const empty = $('[data-empty]');
const bar = $('[data-checkout-bar]');
const alertBox = $('[data-form-alert]');
const summaryToggle = $('[data-summary-toggle]');

const CUSTOMER_KEY = 'ph_customer';
const ORDER_KEY = 'ph_last_order';
const CLIENT_ORDER_KEY = 'ph_checkout_order';
const FIELDS = ['nombre', 'telefono', 'email', 'provincia', 'canton', 'distrito', 'direccion', 'comentarios'];

let methods = { sinpe: true, card: true };
// InitiateCheckout fires once per checkout page view (browser now; the server repeats it with the
// same event_id when the order is submitted, so Meta deduplicates the pair).
const IC_EVENT_ID = `ic_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
let icTracked = false;
let submitting = false;
let attempted = false;

/* ---------- summary ---------- */
function renderSummary() {
  const s = cart.summary();
  const has = s.items.length > 0;
  grid.hidden = !has;
  empty.hidden = has;
  bar.hidden = !has;
  document.body.classList.toggle('checkout-has-items', has);
  if (!has) return;

  $('[data-lines]').innerHTML = s.items.map((l) => lineHtml(l, catalog.products[l.key], { compact: true })).join('');
  $('[data-subtotal]').textContent = formatCRC(s.subtotal);
  $('[data-shipping]').textContent = s.shipping ? formatCRC(s.shipping) : 'Gratis';
  $('[data-ship-progress]').innerHTML = shippingProgress(s.subtotal);
  $('[data-total]').textContent = formatCRC(s.total);
  $('[data-savings-row]').hidden = !s.savings;
  $('[data-savings]').textContent = `−${formatCRC(s.savings)}`;
  $('[data-summary-mini]').textContent = formatCRC(s.total);
  $('[data-bar-total]').textContent = formatCRC(s.total);
  updateSubmitLabel();
  if (!icTracked) {
    icTracked = true;
    track('InitiateCheckout', { ...orderContents(s.items), value: s.subtotal, currency: 'CRC' }, { eventID: IC_EVENT_ID });
  }
}

function method() {
  const checked = $('input[name="metodo"]:checked', form);
  return checked ? checked.value : 'sinpe';
}

/** Email is optional for SINPE (confirmed by WhatsApp) and required for cards (Tilopay). Same rule on the server. */
const rules = () => ({ emailRequired: method() === 'card' });

function updateSubmitLabel() {
  const total = formatCRC(cart.summary().total);
  const card = method() === 'card';
  const busy = card ? 'Conectando con el pago…' : 'Registrando tu pedido…';
  const main = submitting ? busy : card ? `Pagar con tarjeta · ${total}` : `Ordenar con SINPE Móvil · ${total}`;
  const short = submitting ? busy : card ? 'Pagar con tarjeta' : 'Ordenar con SINPE';
  $$('[data-submit-label]').forEach((el) => { el.textContent = main; });
  $$('[data-submit-label-bar]').forEach((el) => { el.textContent = short; });
  $$('[data-submit], [data-submit-bar]').forEach((b) => { b.disabled = submitting; });
}

/* ---------- payment methods ---------- */
function syncMethod() {
  const m = method();
  $$('.pay-opt', form).forEach((o) => o.classList.toggle('on', o.dataset.method === m));
  $('[data-help-sinpe]').hidden = m !== 'sinpe';
  $('[data-help-card]').hidden = m !== 'card';
  const email = fieldEl('email');
  if (email) email.required = m === 'card';
  $$('[data-email-optional]', form).forEach((el) => { el.hidden = m === 'card'; });
  if (attempted) setError('email', validateCheckout(readCustomer().customer, rules()).email || '');
  updateSubmitLabel();
}

function applyMethods() {
  $('.pay-opt[data-method="sinpe"]', form).hidden = !methods.sinpe;
  $('.pay-opt[data-method="card"]', form).hidden = !methods.card;
  const current = $(`input[name="metodo"][value="${method()}"]`, form);
  if (current && current.closest('.pay-opt').hidden) {
    const fallback = methods.sinpe ? 'sinpe' : 'card';
    $(`input[name="metodo"][value="${fallback}"]`, form).checked = true;
  }
  syncMethod();
}

async function loadConfig() {
  try {
    const res = await fetch('/api/config', { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const cfg = await res.json();
    methods = { sinpe: Boolean(cfg.sinpe?.enabled), card: Boolean(cfg.card?.enabled) };
    // Never leave the customer with no way to pay: if config says neither, show both and let the server answer.
    if (!methods.sinpe && !methods.card) methods = { sinpe: true, card: true };
    applyMethods();
  } catch { /* offline/dev without API: keep both options */ }
}

/* ---------- validation UI ---------- */
function fieldEl(name) { return form.elements[name]; }

function setError(name, message) {
  const el = fieldEl(name);
  const wrap = $(`[data-field="${name}"]`, form);
  const msg = $(`#${name}-error`, form);
  if (!el || !wrap || !msg) return;
  wrap.classList.toggle('invalid', Boolean(message));
  if (message) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  msg.textContent = message || '';
  msg.hidden = !message;
}

function showErrors(errors) {
  FIELDS.forEach((n) => setError(n, errors[n] || ''));
  const first = Object.keys(errors).find((n) => fieldEl(n));
  if (first) {
    const el = fieldEl(first);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => el.focus({ preventScroll: true }), 250);
  }
}

function showAlert(message) {
  alertBox.textContent = message;
  alertBox.hidden = !message;
  if (message) alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function readCustomer() {
  const data = Object.fromEntries(new FormData(form).entries());
  return { raw: data, customer: sanitizeCustomer(data) };
}

form.addEventListener('input', (e) => {
  const name = e.target.name;
  if (name && attempted) setError(name, validateCheckout(readCustomer().customer, rules())[name] || '');
  else if (name && $(`[data-field="${name}"]`, form)?.classList.contains('invalid')) setError(name, '');
  if (alertBox && !alertBox.hidden) showAlert('');
  saveCustomer();
});
form.addEventListener('change', (e) => { if (e.target.name === 'metodo') syncMethod(); });
form.addEventListener('focusout', (e) => {
  if (e.target.name === 'telefono' && e.target.value.trim()) e.target.value = formatPhone(e.target.value);
  if (attempted && e.target.name) setError(e.target.name, validateCheckout(readCustomer().customer, rules())[e.target.name] || '');
});

/* ---------- remember contact details (convenience, never payment data) ---------- */
function saveCustomer() {
  const { customer } = readCustomer();
  storageSet(CUSTOMER_KEY, JSON.stringify(customer));
}
function restoreCustomer() {
  try {
    const saved = JSON.parse(storageGet(CUSTOMER_KEY) || '{}');
    FIELDS.forEach((n) => { if (saved[n] && fieldEl(n) && !fieldEl(n).value) fieldEl(n).value = saved[n]; });
  } catch { /* ignore */ }
}

/* ---------- order id: stable per cart+customer so double submits map to one order ---------- */
function clientOrderId(customer, total) {
  const fingerprint = JSON.stringify({ e: customer.email, p: customer.telefono.replace(/\D/g, ''), i: cart.items(), t: total });
  try {
    const cur = JSON.parse(sessionStorage.getItem(CLIENT_ORDER_KEY) || 'null');
    if (cur && cur.fingerprint === fingerprint && /^ORD-\d{10,}-\d{4}$/.test(cur.orderId)) return cur.orderId;
  } catch { /* ignore */ }
  const orderId = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  try { sessionStorage.setItem(CLIENT_ORDER_KEY, JSON.stringify({ orderId, fingerprint })); } catch { /* ignore */ }
  return orderId;
}

function setBusy(on) {
  submitting = on;
  $$('input, select, textarea', form).forEach((el) => { if (el.type !== 'radio') el.readOnly = on; });
  form.setAttribute('aria-busy', String(on));
  $$('[data-submit], [data-submit-bar]').forEach((b) => {
    b.classList.toggle('loading', on);
    const sp = $('.spinner', b);
    if (on && !sp) { const s = document.createElement('span'); s.className = 'spinner'; b.prepend(s); }
    if (!on && sp) sp.remove();
  });
  updateSubmitLabel();
}

/* ---------- submit ---------- */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (submitting) return;
  attempted = true;
  showAlert('');

  const summary = cart.summary();
  if (!summary.items.length) { renderSummary(); return; }

  const { raw, customer } = readCustomer();
  const errors = validateCheckout(customer, rules());
  if (Object.keys(errors).length) {
    showErrors(errors);
    showAlert('Revisá los campos marcados para continuar.');
    return;
  }

  const m = method();
  const payload = {
    ...customer,
    website: raw.website || '',
    items: summary.items.map(({ key, qty }) => ({ key, qty })),
    clientOrderId: clientOrderId(customer, summary.total),
    meta: { ...metaIds(), icEventId: IC_EVENT_ID }
  };

  setBusy(true);
  try {
    const res = await fetch(m === 'card' ? '/api/tilopay/create-payment' : '/api/sinpe/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setBusy(false);
      if (data.errors) { showErrors(data.errors); showAlert('Revisá los campos marcados para continuar.'); return; }
      if (data.error === 'sinpe_unavailable') {
        methods.sinpe = false;
        applyMethods();
        showAlert(data.message);
        return;
      }
      showAlert(data.message || 'No pudimos procesar tu pedido. Intentá de nuevo o escribinos por WhatsApp.');
      return;
    }

    const contents = orderContents(summary.items);
    if (m === 'card') {
      // https only; http://localhost is the sandbox redirect used by `npm run dev`
      if (!/^(https:\/\/|http:\/\/localhost[:/])/i.test(String(data.paymentUrl || ''))) throw new Error('Missing payment URL');
      storageSet(ORDER_KEY, JSON.stringify({ method: 'card', orderId: data.orderId, total: data.total, items: summary.items, savedAt: Date.now() }));
      await afterTracking();
      window.location.assign(data.paymentUrl); // cart is cleared on /success.html once the payment is approved
      return;
    }

    // SINPE Móvil: the order is registered; the customer now pays from their bank app.
    track('Lead', { ...contents, value: data.total }, data.metaEventId ? { eventID: data.metaEventId } : undefined);
    storageSet(ORDER_KEY, JSON.stringify({ method: 'sinpe', ...data, savedAt: Date.now() }));
    try { sessionStorage.removeItem(CLIENT_ORDER_KEY); } catch { /* ignore */ }
    cart.clear();
    await afterTracking();
    window.location.assign(`/pedido/?o=${encodeURIComponent(data.orderId)}`);
  } catch (err) {
    console.error('Checkout error:', err);
    setBusy(false);
    toast('Error de conexión. Revisá tu internet e intentá de nuevo.', { type: 'error' });
    showAlert('No pudimos conectar con el servidor. Intentá de nuevo en unos segundos o escribinos por WhatsApp.');
  }
});

/* ---------- back button after redirect: bfcache restores the busy state ---------- */
window.addEventListener('pageshow', (e) => { if (e.persisted && submitting) setBusy(false); });

/* ---------- init ---------- */
bindLineControls($('[data-lines]'), cart);
cart.subscribe(renderSummary);
restoreCustomer();
renderSummary();
syncMethod();
loadConfig();

// Desktop shows the summary expanded and always visible; mobile starts collapsed to keep the form first.
const mq = matchMedia('(min-width: 900px)');
const syncSummary = () => { summaryToggle.open = mq.matches; };
mq.addEventListener('change', syncSummary);
syncSummary();

