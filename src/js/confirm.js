/** /pedido/ – shows SINPE Móvil payment instructions (or a card order recap) from the saved order. */
import './core.js';
import { storageGet } from './lib/store.js';
import { $, $$, formatCRC, esc, toast } from './lib/ui.js';
import { formatPhone } from '../../shared/validate.js';
import { SITE } from '../../shared/catalog.js';

const states = $$('[data-state]');
const show = (name) => states.forEach((s) => { s.hidden = s.dataset.state !== name; });

let order = null;
try { order = JSON.parse(storageGet('ph_last_order') || 'null'); } catch { order = null; }
const wanted = new URLSearchParams(location.search).get('o');

if (!order || !order.orderId || (wanted && wanted !== order.orderId)) {
  show('none');
} else {
  const isSinpe = order.method === 'sinpe' && order.sinpe;
  $$('[data-order-id]').forEach((el) => { el.textContent = order.orderId; });

  if (isSinpe) {
    const first = String(order.customer?.nombre || '').split(/\s+/)[0];
    if (first) $('[data-name]').textContent = first;
    $('[data-amount]').textContent = formatCRC(order.sinpe.amount);
    $('[data-phone]').textContent = formatPhone(order.sinpe.phone);
    $('[data-holder]').textContent = `A nombre de ${order.sinpe.holder}`;
    $('[data-reference]').textContent = order.sinpe.reference;
    const text = `Hola PatchHouse, te envío el comprobante SINPE del pedido ${order.orderId} por ${formatCRC(order.sinpe.amount)}.`;
    $('[data-wa]').href = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
    show('sinpe');

    $$('[data-copy]').forEach((btn) => btn.addEventListener('click', async () => {
      const value = btn.dataset.copy === 'phone' ? order.sinpe.phone : order.sinpe.reference;
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = value; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.append(ta); ta.select();
        try { document.execCommand('copy'); } catch { /* ignore */ }
        ta.remove();
      }
      const old = btn.textContent;
      btn.textContent = '¡Copiado!';
      toast(btn.dataset.copy === 'phone' ? 'Número copiado' : 'Detalle copiado');
      setTimeout(() => { btn.textContent = old; }, 1800);
    }));
  } else {
    show('card');
  }

  const items = order.items || [];
  if (items.length) {
    $('[data-lines]').innerHTML = items.map((i) => `
      <div class="recap-line"><span>${esc(i.name || i.key)} <i>× ${Number(i.qty) || 1}</i></span><b>${formatCRC(i.lineTotal ?? 0)}</b></div>`).join('');
    $('[data-total]').textContent = formatCRC(order.total ?? order.sinpe?.amount ?? 0);
    $('[data-recap]').hidden = false;
  }
}
