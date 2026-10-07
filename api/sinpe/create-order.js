/**
 * PatchHouse – SINPE Móvil order.
 *
 * Registers the order as PENDIENTE (CRM + admin email + customer email with payment
 * instructions + Meta Lead). Money is verified by a human: the customer sends the SINPE
 * receipt over WhatsApp and the order is dispatched once the deposit is visible in the bank.
 */
import { sendOrderEmail } from '../_lib/email.js';
import { sendOrderToBetsyWithRetry } from '../_lib/betsy.js';
import { sendMetaEvent, generateEventId, checkoutEventId } from '../_lib/meta.js';
import { catalog, normalizeTrustedOrder } from '../_lib/order.js';
import { guardPost, parseBody, appUrl, newOrderId, ORDER_ID_RE, sinpeConfig, isDryRun } from '../_lib/http.js';
import { validateCheckout, sanitizeCustomer } from '../../shared/validate.js';

export default async function handler(req, res) {
  if (!guardPost(req, res)) return;

  try {
    const body = parseBody(req);
    if (body.website) return res.status(400).json({ error: 'Rejected' }); // honeypot

    const sinpe = sinpeConfig();
    if (!sinpe.enabled) {
      return res.status(503).json({ error: 'sinpe_unavailable', message: 'SINPE Móvil no está disponible en este momento. Pagá con tarjeta o escribinos por WhatsApp.' });
    }

    const customer = sanitizeCustomer(body);
    const errors = validateCheckout(customer, { emailRequired: false });
    if (Object.keys(errors).length) {
      return res.status(400).json({ error: 'Invalid fields', message: 'Faltan datos requeridos para continuar.', errors, missingFields: Object.keys(errors) });
    }

    let rawItems = body.items;
    if (typeof rawItems === 'string') {
      try { rawItems = JSON.parse(rawItems); } catch { rawItems = []; }
    }
    if (!catalog.priceOrder(rawItems).items.length) {
      return res.status(400).json({ error: 'No valid products', message: 'Tu carrito no tiene productos disponibles.' });
    }

    const orderId = ORDER_ID_RE.test(String(body.clientOrderId || '')) ? body.clientOrderId : newOrderId();
    const order = normalizeTrustedOrder({
      orderId, ...customer, items: rawItems,
      paymentMethod: 'SINPE Móvil', paymentStatus: 'pending',
      createdAt: new Date().toISOString()
    });

    const metaEventId = generateEventId('lead', orderId);
    const site = appUrl();
    let crmOk = true;
    let emailOk = true;
    if (isDryRun()) {
      console.log('[SINPE][dry-run] order not sent anywhere:', orderId, order.total);
    } else {
      const contents = {
        currency: 'CRC', content_type: 'product',
        content_ids: order.items.map((i) => i.key),
        num_items: order.items.reduce((n, i) => n + i.qty, 0)
      };
      // Server copy of the checkout page's InitiateCheckout (same event_id, Meta keeps one).
      sendMetaEvent('InitiateCheckout', checkoutEventId(body.meta, orderId), order, req, { ...contents, value: order.subtotal }, `${site}/checkout/`, body.meta)
        .catch((e) => console.warn('[SINPE] Meta InitiateCheckout failed:', e && e.message));
      const [betsy, email, meta] = await Promise.allSettled([
        sendOrderToBetsyWithRetry(order),
        sendOrderEmail(order, { sinpe }),
        sendMetaEvent('Lead', metaEventId, order, req, {
          value: order.total, currency: 'CRC', content_type: 'product',
          content_ids: order.items.map((i) => i.key),
          num_items: order.items.reduce((n, i) => n + i.qty, 0)
        }, `${site}/checkout/`, body.meta)
      ]);

      crmOk = betsy.status === 'fulfilled' && Boolean(betsy.value && betsy.value.success);
      emailOk = email.status === 'fulfilled' && Boolean(email.value && email.value.success);
      if (!crmOk && !emailOk) {
        console.error('[SINPE] order not recorded anywhere:', orderId, betsy.reason || betsy.value, email.reason);
        return res.status(502).json({ error: 'order_not_recorded', message: 'No pudimos registrar tu pedido. Escribinos por WhatsApp y lo hacemos juntos.' });
      }
      if (meta.status === 'rejected') console.warn('[SINPE] Meta Lead failed:', meta.reason && meta.reason.message);
    }

    return res.json({
      success: true,
      orderId,
      metaEventId,
      total: order.total,
      items: order.items.map(({ key, name, qty, lineTotal }) => ({ key, name, qty, lineTotal })),
      customer: { nombre: order.nombre, email: order.email },
      sinpe: { phone: sinpe.phone, holder: sinpe.holder, amount: order.total, reference: orderId }
    });
  } catch (error) {
    console.error('[SINPE] create-order error:', error.message);
    return res.status(500).json({ error: 'sinpe_failed', message: 'Hubo un error al registrar tu pedido. Intentá de nuevo o escribinos por WhatsApp.' });
  }
}
