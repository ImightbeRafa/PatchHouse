import test from 'node:test';
import assert from 'node:assert/strict';

process.env.ORDER_DRY_RUN = 'true';
process.env.ORDER_SIGNING_SECRET = 'test-secret';
const creds = { TILOPAY_API_KEY: 'KEY-123', TILOPAY_USER: 'apiuser', TILOPAY_PASSWORD: 'pa$$ word' };
Object.assign(process.env, creds);

const { phpUrlencode, phpNumberFormat2, computeOrderHash, verifyTilopayRedirect } = await import('../api/_lib/tilopay.js');
const { signOrder } = await import('../api/_lib/sign.js');
const { default: confirm } = await import('../api/tilopay/confirm.js');
const { shippingFor, FREE_SHIPPING_FROM, buildCatalog, readConfig } = await import('../shared/catalog.js');

test('PHP-compatible encoding (urlencode + number_format)', () => {
  assert.equal(phpUrlencode('María Pérez@mail.com'), 'Mar%C3%ADa+P%C3%A9rez%40mail.com');
  assert.equal(phpUrlencode("a*b~c!d'e(f)"), 'a%2Ab%7Ec%21d%27e%28f%29');
  assert.equal(phpNumberFormat2(39800), '39,800.00');
  assert.equal(phpNumberFormat2(9900), '9,900.00');
  assert.equal(phpNumberFormat2(1234567.5), '1,234,567.50');
});

const base = { tpt: '987654', orderNumber: 'ORD-1791071433000-2906', amount: 39800, code: '1', auth: 'A12345', email: 'maria@correo.com' };

test('OrderHash: valid signature verifies, any tampering fails', () => {
  const orderHash = computeOrderHash(base, creds);
  assert.match(orderHash, /^[0-9a-f]{64}$/);
  assert.equal(verifyTilopayRedirect({ ...base, orderHash }, creds), true);
  assert.equal(verifyTilopayRedirect({ ...base, orderHash, amount: 100 }, creds), false);
  assert.equal(verifyTilopayRedirect({ ...base, orderHash, orderNumber: 'ORD-1791071433000-1111' }, creds), false);
  assert.equal(verifyTilopayRedirect({ ...base, orderHash, code: '0' }, creds), false);
  assert.equal(verifyTilopayRedirect({ ...base, orderHash, auth: '12' }, creds), false);
  assert.equal(verifyTilopayRedirect({ ...base, orderHash: 'f'.repeat(64) }, creds), false);
  assert.equal(verifyTilopayRedirect({ ...base, orderHash }, { ...creds, TILOPAY_PASSWORD: 'other' }), false);
});

function call(handler, body) {
  return new Promise((resolve) => {
    const res = { statusCode: 200, setHeader() {}, status(c) { this.statusCode = c; return this; }, json(d) { resolve({ status: this.statusCode, body: d }); return this; } };
    handler({ method: 'POST', body, headers: { host: 'localhost:3000' } }, res);
  });
}

test('confirm: verified Tilopay redirect is fulfilled immediately; unverified waits for the webhook', async () => {
  const snapshot = { orderId: base.orderNumber, nombre: 'María Fernández', telefono: '8888-1234', email: base.email, provincia: 'Heredia', canton: 'Heredia', distrito: 'San Rafael', direccion: '200 m norte de la iglesia', items: [{ key: 'combo-trio', qty: 1 }, { key: 'energy', qty: 1 }], total: 36800 };
  const returnData = signOrder(snapshot);
  const orderHash = computeOrderHash({ ...base, amount: 36800 }, creds);
  const ok = await call(confirm, { orderId: base.orderNumber, transactionId: base.tpt, code: '1', auth: base.auth, returnData, orderHash });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.success, true);
  assert.equal(ok.body.pending, undefined);
  const forged = await call(confirm, { orderId: base.orderNumber, transactionId: base.tpt, code: '1', auth: base.auth, returnData, orderHash: 'a'.repeat(64) });
  assert.equal(forged.body.pending, true);
});

test('free shipping from ₡25.000 (server and browser share this rule)', () => {
  assert.equal(FREE_SHIPPING_FROM, 25000);
  assert.equal(shippingFor(0), 0);
  assert.equal(shippingFor(24900), 3000);
  assert.equal(shippingFor(25000), 0);
  const cat = buildCatalog(readConfig({}));
  assert.equal(cat.priceOrder([{ key: 'combo-trio', qty: 1 }]).shipping, 0);          // 26.900
  assert.equal(cat.priceOrder([{ key: 'combo-energia-foco', qty: 1 }]).shipping, 3000); // 17.900
  assert.equal(cat.priceOrder([{ key: 'combo-trio', qty: 1 }, { key: 'energy', qty: 1 }]).total, 36800);
});
