/**
 * /success.html – Tilopay redirect target.
 * Redirect parameters are untrusted: this page only reports status. The order is fulfilled
 * by the signed Tilopay webhook (see api/tilopay/confirm.js).
 */
import './core.js';
import { cart } from './lib/store.js';
import { $, $$, track, orderContents } from './lib/ui.js';

const states = $$('[data-state]');
const show = (name) => states.forEach((s) => { s.hidden = s.dataset.state !== name; });

const q = new URLSearchParams(location.search);
const orderId = q.get('orderId') || q.get('order') || q.get('orderNumber');
const transactionId = q.get('tilopay-transaction') || q.get('tpt') || q.get('transactionId');
const code = q.get('code');
const returnData = q.get('returnData');
const orderHash = q.get('OrderHash') || q.get('orderHash');

function fail(title, text) {
  if (title) $('[data-error-title]').textContent = title;
  if (text) $('[data-error-text]').textContent = text;
  document.title = 'Error en el pago | PatchHouse.CR';
  show('error');
}

function done(summary, pending) {
  $('[data-order-id]').textContent = summary?.orderId || orderId || '—';
  if (pending) {
    $('[data-title]').textContent = '¡Recibimos tu pago!';
    $('[data-text]').textContent = 'Tu pedido está en proceso. Lo confirmamos en cuanto Tilopay nos notifique la transacción.';
    $('[data-next]').textContent = 'Te enviaremos un correo de confirmación en unos minutos. Si no lo ves, revisá spam o escribinos por WhatsApp con tu número de orden.';
  }
  document.title = 'Pedido recibido | PatchHouse.CR';
  cart.clear();
  try { sessionStorage.removeItem('ph_checkout_order'); } catch { /* ignore */ }
  show('success');
}

(async function main() {
  if (!code) {
    fail('No se detectó un pago', 'Esta página solo funciona después de completar un pago con tarjeta. Si ya pagaste y ves este mensaje, escribinos por WhatsApp.');
    return;
  }
  if (String(code) !== '1') {
    const params = new URLSearchParams({ orderId: orderId || '', code, description: q.get('description') || q.get('mensaje') || '' });
    location.replace(`/error.html?${params}`);
    return;
  }

  const seenKey = `ph_confirmed_${orderId}_${transactionId}`;
  try {
    if (sessionStorage.getItem(seenKey)) { done({ orderId }, false); return; }
  } catch { /* ignore */ }

  try {
    const res = await fetch('/api/tilopay/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, transactionId, code, returnData, orderHash })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      fail('No pudimos verificar tu pago', data.message || `Escribinos por WhatsApp con tu número de orden: ${orderId || 'N/A'}`);
      return;
    }
    try { sessionStorage.setItem(seenKey, '1'); } catch { /* ignore */ }
    // Browser Purchase shares its eventID with the server event so Meta de-duplicates them.
    if (!data.pending) track('Purchase', { ...orderContents(data.items || []), value: data.total, currency: 'CRC' }, data.metaEventId ? { eventID: data.metaEventId } : undefined);
    done(data, Boolean(data.pending));
  } catch {
    fail('Error de conexión', 'No pudimos confirmar el pago por un problema de conexión. Si ya pagaste, escribinos por WhatsApp con tu número de orden.');
  }
})();
