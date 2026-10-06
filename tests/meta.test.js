import test from 'node:test';
import assert from 'node:assert/strict';

process.env.ORDER_DRY_RUN = 'true';
process.env.ORDER_SIGNING_SECRET = 'test-secret';
delete process.env.VITE_SOLD_OUT;
delete process.env.SOLD_OUT;

const { browserContext, snapshotContext, sendMetaEvent, normalizeMetaPhone } = await import('../api/_lib/meta.js');
const { verifyOrderToken } = await import('../api/_lib/sign.js');
const { default: card } = await import('../api/tilopay/create-payment.js');

const FBP = 'fb.1.1791071433000.1234567890';
const FBC = 'fb.1.1791071433000.IwZXh0bgNhZW0BMABhZGlkAasT0Xyz_-abc';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148';
const shopperReq = {
  headers: { host: 'localhost:3000', cookie: `_ga=1; _fbp=${FBP}; _fbc=${FBC}`, 'x-forwarded-for': '201.191.10.20, 10.0.0.1', 'user-agent': UA }
};
const customer = { nombre: 'María José Fernández', telefono: '8888-1234', email: 'Maria@Example.com', provincia: 'San José', canton: 'Pérez Zeledón', distrito: 'San Isidro', direccion: '200 m norte de la iglesia, casa blanca' };

test('browserContext: reads fbp/fbc cookies, first forwarded IP and user agent', () => {
  assert.deepEqual(browserContext(shopperReq), { fbp: FBP, fbc: FBC, ip: '201.191.10.20', ua: UA });
});

test('browserContext: falls back to posted ids and rejects malformed values', () => {
  const ctx = browserContext({ headers: { cookie: '_fbp=garbage' } }, { fbp: FBP, fbc: 'not-a-cookie' });
  assert.equal(ctx.fbp, FBP);
  assert.equal(ctx.fbc, undefined);
});

test('phone is sent as 506 + 8 digits', () => {
  assert.equal(normalizeMetaPhone('8888-1234'), '50688881234');
  assert.equal(normalizeMetaPhone('+506 5061-2345'), '50650612345');
  assert.equal(normalizeMetaPhone('12'), '');
});

test('card checkout: shopper context travels in the signed Tilopay snapshot', async () => {
  const r = await new Promise((resolve) => {
    const res = { statusCode: 200, setHeader() {}, status(c) { this.statusCode = c; return this; }, json(d) { resolve({ status: this.statusCode, body: d }); return this; } };
    card({ method: 'POST', headers: shopperReq.headers, body: { ...customer, items: [{ key: 'focus', qty: 1 }] } }, res);
  });
  assert.equal(r.status, 200);
  const returnData = new URL(r.body.paymentUrl).searchParams.get('returnData');
  const snap = verifyOrderToken(returnData);
  assert.deepEqual(snap.m, { fbp: FBP, fbc: FBC, ip: '201.191.10.20', ua: UA });
  assert.ok(returnData.length < 2000, `returnData is ${returnData.length} chars`);
});

test('snapshotContext caps oversized values', () => {
  const m = snapshotContext({ fbp: FBP, fbc: `fb.1.1791071433000.${'a'.repeat(400)}`, ua: 'x'.repeat(500) });
  assert.equal(m.fbc, undefined);
  assert.equal(m.ua.length, 300);
});

async function captureEvent(fn) {
  const realFetch = globalThis.fetch;
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  process.env.META_CAPI_ACCESS_TOKEN = 'test-token';
  let sent;
  globalThis.fetch = async (url, opts) => { sent = JSON.parse(opts.body); return { ok: true, json: async () => ({ events_received: 1 }) }; };
  try { await fn(); } finally {
    globalThis.fetch = realFetch;
    if (token === undefined) delete process.env.META_CAPI_ACCESS_TOKEN; else process.env.META_CAPI_ACCESS_TOKEN = token;
  }
  return sent.data[0];
}

test('webhook Purchase (no shopper request) uses the saved shopper context, never the caller', async () => {
  const ev = await captureEvent(() => sendMetaEvent('Purchase', 'purchase_ORD_T1', { ...customer, m: { fbp: FBP, fbc: FBC, ip: '201.191.10.20', ua: UA } }, null, { value: 9900, currency: 'CRC' }, 'https://www.patchhouse.shopping/success.html'));
  assert.equal(ev.event_id, 'purchase_ORD_T1');
  assert.equal(ev.user_data.fbp, FBP);
  assert.equal(ev.user_data.fbc, FBC);
  assert.equal(ev.user_data.client_ip_address, '201.191.10.20');
  assert.equal(ev.user_data.client_user_agent, UA);
  assert.equal(ev.user_data.zp, undefined);
  assert.ok(ev.user_data.external_id[0].length === 64);
});

test('city/state are normalized before hashing (no accents/spaces)', async () => {
  const crypto = await import('node:crypto');
  const h = (s) => crypto.createHash('sha256').update(s).digest('hex');
  const ev = await captureEvent(() => sendMetaEvent('Lead', 'lead_ORD', customer, shopperReq, {}, undefined));
  assert.equal(ev.user_data.ct[0], h('perezzeledon'));
  assert.equal(ev.user_data.st[0], h('sanjose'));
  assert.equal(ev.user_data.em[0], h('maria@example.com'));
  assert.equal(ev.user_data.ph[0], h('50688881234'));
  assert.equal(ev.event_source_url, 'https://www.patchhouse.shopping');
});
