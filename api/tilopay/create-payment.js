/**
 * PatchHouse – Tilopay: create a hosted payment for the cart.
 * Prices are recomputed here from the shared catalog; the browser's totals are never trusted.
 */
import { sendMetaEvent, generateEventId } from '../_lib/meta.js';
import { catalog } from '../_lib/order.js';
import { signOrder, hasSigningSecret } from '../_lib/sign.js';
import { guardPost, parseBody, appUrl, newOrderId, ORDER_ID_RE, cardConfig, isDryRun } from '../_lib/http.js';
import { validateCheckout, sanitizeCustomer } from '../../shared/validate.js';

const withTimeout = (ms = 12000) => ({ signal: AbortSignal.timeout(ms) });
const PROVINCE_STATES = { 'San José': 'SJ', 'Alajuela': 'A', 'Cartago': 'C', 'Heredia': 'H', 'Guanacaste': 'G', 'Puntarenas': 'P', 'Limón': 'L' };

async function authenticateTilopay(baseUrl) {
  const { TILOPAY_USER: apiuser, TILOPAY_PASSWORD: password } = process.env;
  if (!apiuser || !password) throw new Error('Tilopay credentials not configured');

  const res = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiuser, password }),
    ...withTimeout()
  });
  if (!res.ok) throw new Error(`Tilopay login failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (!data.access_token) throw new Error('No access token in Tilopay response');
  return data.access_token;
}

export default async function handler(req, res) {
  if (!guardPost(req, res)) return;

  try {
    const body = parseBody(req);
    if (body.website) return res.status(400).json({ error: 'Rejected' }); // honeypot

    const customer = sanitizeCustomer(body);
    const errors = validateCheckout(customer);
    if (Object.keys(errors).length) {
      return res.status(400).json({ error: 'Invalid fields', message: 'Faltan datos requeridos para continuar.', errors, missingFields: Object.keys(errors) });
    }

    let rawItems = body.items;
    if (typeof rawItems === 'string') {
      try { rawItems = JSON.parse(rawItems); } catch { rawItems = []; }
    }
    const priced = catalog.priceOrder(rawItems);
    if (!priced.items.length) {
      return res.status(400).json({ error: 'No valid products', message: 'Tu carrito no tiene productos disponibles.' });
    }

    if (!isDryRun() && !cardConfig().enabled) throw new Error('Tilopay is not configured');
    if (!hasSigningSecret()) throw new Error('Order signing secret is not configured');

    const orderId = ORDER_ID_RE.test(String(body.clientOrderId || '')) ? body.clientOrderId : newOrderId();
    const baseUrl = process.env.TILOPAY_BASE_URL || 'https://app.tilopay.com/api/v1';
    const site = appUrl();
    const [firstName, ...rest] = customer.nombre.split(/\s+/);
    const lastName = rest.join(' ') || firstName;
    const state = `CR-${PROVINCE_STATES[customer.provincia] || 'SJ'}`;

    // Compact, signed snapshot of the order; prices are re-derived on confirmation.
    const snapshot = {
      orderId, ...customer,
      items: priced.items.map(({ key, qty }) => ({ key, qty })),
      createdAt: new Date().toISOString()
    };

    if (isDryRun()) {
      // Sandbox: skip Tilopay and send the browser straight to our own success page with a signed snapshot.
      const params = new URLSearchParams({ orderId, code: '1', 'tilopay-transaction': 'DRYRUN', returnData: signOrder(snapshot) });
      return res.json({ success: true, orderId, metaEventId: generateEventId('ic', orderId), paymentUrl: `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/success.html?${params}`, total: priced.total, dryRun: true });
    }

    const accessToken = await authenticateTilopay(baseUrl);
    const payRes = await fetch(`${baseUrl}/processPayment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      ...withTimeout(),
      body: JSON.stringify({
        key: process.env.TILOPAY_API_KEY,
        amount: Math.round(priced.total),
        currency: 'CRC',
        redirect: `${site}/success.html`,
        hashVersion: 'V2',
        billToFirstName: firstName, billToLastName: lastName,
        billToAddress: customer.direccion, billToAddress2: `${customer.distrito}, ${customer.canton}`,
        billToCity: customer.canton, billToState: state, billToZipPostCode: '10101', billToCountry: 'CR',
        billToTelephone: customer.telefono, billToEmail: customer.email,
        shipToFirstName: firstName, shipToLastName: lastName,
        shipToAddress: customer.direccion, shipToAddress2: `${customer.distrito}, ${customer.canton}`,
        shipToCity: customer.canton, shipToState: state, shipToZipPostCode: '10101', shipToCountry: 'CR',
        shipToTelephone: customer.telefono,
        orderNumber: orderId,
        capture: '1',
        subscription: '0',
        platform: 'PatchHouse',
        returnData: signOrder(snapshot),
        token_version: 'v2'
      })
    });

    if (!payRes.ok) throw new Error(`processPayment failed: ${payRes.status} ${await payRes.text()}`);
    const payment = await payRes.json();
    const paymentUrl = payment.urlPaymentForm || payment.url || payment.payment_url;
    if (!paymentUrl) throw new Error('No payment URL received from Tilopay');

    const metaEventId = generateEventId('ic', orderId);
    await sendMetaEvent('InitiateCheckout', metaEventId, customer, req, {
      value: priced.total, currency: 'CRC', content_type: 'product',
      content_ids: priced.items.map((i) => i.key),
      num_items: priced.items.reduce((n, i) => n + i.qty, 0)
    }, `${site}/checkout/`).catch(() => {});

    return res.json({ success: true, orderId, metaEventId, paymentUrl, total: priced.total });
  } catch (error) {
    console.error('[Tilopay] create-payment error:', error.message);
    return res.status(500).json({ error: 'Failed to create payment', message: 'Hubo un error al conectar con el pago con tarjeta. Intentá de nuevo o pagá con SINPE Móvil.' });
  }
}
