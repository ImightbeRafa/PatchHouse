import test from 'node:test';
import assert from 'node:assert/strict';

// Sandbox + known secrets BEFORE the handlers load (they read env at import/call time).
process.env.ORDER_DRY_RUN = 'true';
process.env.ORDER_SIGNING_SECRET = 'test-secret';
process.env.SINPE_PHONE = '8888-7777';
process.env.SINPE_HOLDER = 'PatchHouse Test';
delete process.env.VITE_SOLD_OUT;
delete process.env.SOLD_OUT;

const { signOrder, verifyOrderToken } = await import('../api/_lib/sign.js');
const { default: sinpe } = await import('../api/sinpe/create-order.js');
const { default: card } = await import('../api/tilopay/create-payment.js');
const { default: confirm } = await import('../api/tilopay/confirm.js');
const { default: config } = await import('../api/config.js');

function call(handler, { method = 'POST', body = {}, headers = {} } = {}) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200, headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      status(c) { this.statusCode = c; return this; },
      json(d) { resolve({ status: this.statusCode, body: d, headers: this.headers }); return this; }
    };
    handler({ method, body, headers: { host: 'localhost:3000', ...headers } }, res);
  });
}

const customer = { nombre: 'Maria Fernandez', telefono: '8888-1234', email: 'maria@example.com', provincia: 'Heredia', canton: 'Heredia', distrito: 'San Rafael', direccion: '200 m norte de la iglesia, casa blanca' };

test('SINPE: creates a pending order, re-prices server-side and returns payment instructions', async () => {
  const r = await call(sinpe, { body: { ...customer, items: [{ key: 'focus', qty: 2 }], total: 1, clientOrderId: 'ORD-1791071433000-2906' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.total, 19800 + 3000); // client-supplied total ignored
  assert.equal(r.body.orderId, 'ORD-1791071433000-2906');
  assert.deepEqual(r.body.sinpe, { phone: '88887777', holder: 'PatchHouse Test', amount: 22800, reference: 'ORD-1791071433000-2906' });
});

test('SINPE: rejects invalid fields with per-field errors', async () => {
  const r = await call(sinpe, { body: { ...customer, telefono: '12', items: [{ key: 'focus', qty: 1 }] } });
  assert.equal(r.status, 400);
  assert.ok(r.body.errors.telefono);
});

test('SINPE: rejects empty or unknown carts and honeypot spam', async () => {
  assert.equal((await call(sinpe, { body: { ...customer, items: [{ key: 'bogus', qty: 1 }] } })).status, 400);
  assert.equal((await call(sinpe, { body: { ...customer, items: [{ key: 'focus', qty: 1 }], website: 'http://spam' } })).status, 400);
});

test('SINPE: unavailable when SINPE_PHONE/HOLDER are not configured', async () => {
  const phone = process.env.SINPE_PHONE;
  process.env.SINPE_PHONE = '';
  const r = await call(sinpe, { body: { ...customer, items: [{ key: 'focus', qty: 1 }] } });
  process.env.SINPE_PHONE = phone;
  assert.equal(r.status, 503);
  assert.equal(r.body.error, 'sinpe_unavailable');
});

test('API only accepts same-origin POST', async () => {
  assert.equal((await call(sinpe, { method: 'GET' })).status, 405);
  assert.equal((await call(sinpe, { headers: { origin: 'https://evil.example' }, body: {} })).status, 403);
});

test('config exposes payment availability, no secrets', async () => {
  const r = await call(config, { method: 'GET' });
  assert.deepEqual(r.body, { sinpe: { enabled: true }, card: { enabled: true } });
});

test('signed order tokens verify and reject tampering', () => {
  const token = signOrder({ orderId: 'ORD-1', items: [{ key: 'focus', qty: 1 }] });
  assert.equal(verifyOrderToken(token).orderId, 'ORD-1');
  const [payload, sig] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ orderId: 'ORD-1', items: [{ key: 'focus', qty: 9 }] })).toString('base64url');
  assert.throws(() => verifyOrderToken(`${forged}.${sig}`));
  assert.throws(() => verifyOrderToken(payload)); // unsigned legacy format
  assert.throws(() => verifyOrderToken(''));
});

test('card: create-payment (sandbox) returns a signed redirect that confirm accepts', async () => {
  const created = await call(card, { body: { ...customer, items: [{ key: 'glp1', qty: 1 }] } });
  assert.equal(created.status, 200);
  const url = new URL(created.body.paymentUrl);
  assert.equal(url.pathname, '/success.html');
  const confirmed = await call(confirm, { body: { orderId: url.searchParams.get('orderId'), transactionId: 'T1', code: '1', returnData: url.searchParams.get('returnData') } });
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.body.total, 12900);
  assert.equal(confirmed.body.metaEventId, `purchase_${created.body.orderId}`); // one Purchase id per order
});

test('card: confirm refuses forged redirects (no signature, tampered data, declined code)', async () => {
  const legacy = Buffer.from(JSON.stringify({ orderId: 'ORD-1791071433000-1111', items: [{ key: 'focus', qty: 1 }], ...customer })).toString('base64');
  assert.equal((await call(confirm, { body: { orderId: 'ORD-1', code: '1', returnData: legacy } })).status, 400);
  assert.equal((await call(confirm, { body: { orderId: 'ORD-1', code: '1' } })).status, 400);
  assert.equal((await call(confirm, { body: { orderId: 'ORD-1', code: '0', returnData: signOrder({}) } })).status, 400);
});

test('email is optional for SINPE, required for card (Tilopay needs it)', async () => {
  const { email, ...noEmail } = customer;
  const s = await call(sinpe, { body: { ...noEmail, items: [{ key: 'focus', qty: 1 }] } });
  assert.equal(s.status, 200);
  const c = await call(card, { body: { ...noEmail, items: [{ key: 'focus', qty: 1 }] } });
  assert.equal(c.status, 400);
  assert.ok(c.body.errors.email);
  const bad = await call(sinpe, { body: { ...noEmail, email: 'not-an-email', items: [{ key: 'focus', qty: 1 }] } });
  assert.equal(bad.status, 400); // optional, but still checked when given
});

test('card: InitiateCheckout reuses the event id the checkout page fired (Meta dedup)', async () => {
  const c = await call(card, { body: { ...customer, items: [{ key: 'focus', qty: 1 }], meta: { icEventId: 'ic_mgf3k2_ab12cd34' } } });
  assert.equal(c.body.metaEventId, 'ic_mgf3k2_ab12cd34');
  const forged = await call(card, { body: { ...customer, items: [{ key: 'focus', qty: 1 }], meta: { icEventId: 'purchase_x' } } });
  assert.match(forged.body.metaEventId, /^ic_ORD-/);
});
