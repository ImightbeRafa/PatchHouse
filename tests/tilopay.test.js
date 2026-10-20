import test, { describe } from 'node:test';
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

function customer(orderId, total = 36800) {
  return {
    orderId,
    nombre: 'María Fernández',
    telefono: '8888-1234',
    email: base.email,
    provincia: 'Heredia',
    canton: 'Heredia',
    distrito: 'San Rafael',
    direccion: '200 m norte de la iglesia',
    items: [{ key: 'combo-trio', qty: 1 }, { key: 'energy', qty: 1 }],
    total
  };
}

function approvedBody(orderId, { orderHash = 'a'.repeat(64), amount, total } = {}) {
  const snapshot = customer(orderId, total);
  const body = {
    orderId,
    transactionId: base.tpt,
    code: '1',
    auth: base.auth,
    returnData: signOrder(snapshot),
    orderHash
  };
  if (amount !== undefined) body.amount = amount;
  return body;
}

function subjects(calls) {
  return calls.map((body) => body?.subject || '');
}

async function withLiveFulfillment(betsyMode, fn) {
  const prev = {
    dry: process.env.ORDER_DRY_RUN,
    betsyKey: process.env.BETSY_API_KEY,
    betsyUrl: process.env.BETSY_API_URL,
    resend: process.env.RESEND_API_KEY,
    notify: process.env.ORDER_NOTIFICATION_EMAIL,
    meta: process.env.META_CAPI_ACCESS_TOKEN,
    fetch: globalThis.fetch
  };
  const betsyCalls = [];
  const resendCalls = [];
  const consultCalls = [];
  const tilopayBase = String(process.env.TILOPAY_BASE_URL || 'https://app.tilopay.com/api/v1').replace(/\/+$/, '');
  process.env.ORDER_DRY_RUN = 'false';
  process.env.BETSY_API_KEY = 'betsy-test';
  process.env.BETSY_API_URL = 'https://betsy.test/orders';
  process.env.RESEND_API_KEY = 'resend-test';
  process.env.ORDER_NOTIFICATION_EMAIL = 'owner@example.com';
  delete process.env.META_CAPI_ACCESS_TOKEN;
  const consultRow = (payload) => {
    if (betsyMode === 'declined') return { code: '0', amount: '36800.00', orderNumber: payload.orderNumber, response: 'Rechazada' };
    if (betsyMode === 'mismatch') return { code: '1', amount: '1.00', orderNumber: payload.orderNumber };
    return { code: '1', amount: '36800.00', orderNumber: payload.orderNumber, card: '4021', last: '5221' };
  };
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    const payload = opts?.body ? JSON.parse(opts.body) : null;
    if (u === `${tilopayBase}/login`) {
      if (betsyMode === 'down') return { ok: false, status: 503, text: async () => 'unavailable', json: async () => ({}) };
      return { ok: true, status: 200, text: async () => '', json: async () => ({ access_token: 'tok' }) };
    }
    if (u === `${tilopayBase}/consult`) {
      consultCalls.push(payload);
      return { ok: true, status: 200, text: async () => '', json: async () => ({ type: '200', response: [consultRow(payload)] }) };
    }
    if (u === process.env.BETSY_API_URL) {
      betsyCalls.push(payload);
      if (betsyMode === 'fail') return { ok: false, status: 500, text: async () => 'down', json: async () => ({}) };
      return { ok: true, status: 200, text: async () => '', json: async () => ({ crmOrderId: 'crm-1' }) };
    }
    if (u === 'https://api.resend.com/emails') {
      resendCalls.push(payload);
      return { ok: true, status: 200, text: async () => '', json: async () => ({ id: 'email-1' }) };
    }
    throw new Error(`unexpected fetch ${u}`);
  };
  try {
    return await fn({ betsyCalls, resendCalls, consultCalls });
  } finally {
    process.env.ORDER_DRY_RUN = prev.dry;
    if (prev.betsyKey === undefined) delete process.env.BETSY_API_KEY; else process.env.BETSY_API_KEY = prev.betsyKey;
    if (prev.betsyUrl === undefined) delete process.env.BETSY_API_URL; else process.env.BETSY_API_URL = prev.betsyUrl;
    if (prev.resend === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = prev.resend;
    if (prev.notify === undefined) delete process.env.ORDER_NOTIFICATION_EMAIL; else process.env.ORDER_NOTIFICATION_EMAIL = prev.notify;
    if (prev.meta === undefined) delete process.env.META_CAPI_ACCESS_TOKEN; else process.env.META_CAPI_ACCESS_TOKEN = prev.meta;
    globalThis.fetch = prev.fetch;
  }
}

describe('confirm redirect fulfillment', { concurrency: false }, () => {
  test('signed return is fulfilled even when OrderHash does not verify', async () => {
    const body = approvedBody(base.orderNumber, {
      orderHash: computeOrderHash({ ...base, amount: 36800 }, creds)
    });
    const ok = await call(confirm, body);
    assert.equal(ok.status, 200);
    assert.equal(ok.body.success, true);
    assert.equal(ok.body.pending, undefined);
    assert.equal(ok.body.total, 36800);
    const badHash = await call(confirm, { ...body, orderHash: 'a'.repeat(64) });
    assert.equal(badHash.status, 200);
    assert.equal(badHash.body.success, true);
    assert.equal(badHash.body.pending, undefined);
  });

  test('approved + valid signature is processed once; reload does not duplicate', async () => {
    const orderId = 'ORD-1791071433100-1001';
    const logs = [];
    const prevInfo = console.info;
    console.info = (...args) => {
      logs.push(args);
      prevInfo(...args);
    };
    try {
      await withLiveFulfillment('ok', async ({ betsyCalls, resendCalls, consultCalls }) => {
        const first = await call(confirm, approvedBody(orderId));
        assert.equal(first.status, 200);
        assert.equal(first.body.success, true);
        assert.equal(first.body.pending, undefined);
        assert.equal(first.body.review, undefined);
        assert.equal(first.body.alreadyProcessed, false);
        assert.equal(betsyCalls.length, 1);
        assert.equal(betsyCalls[0].payment.status, 'PAGADO');
        assert.equal(betsyCalls[0].orderId, orderId);
        const sent = subjects(resendCalls);
        assert.equal(sent.filter((s) => s.startsWith('Confirmación de Pedido')).length, 1);
        assert.equal(sent.filter((s) => s.startsWith('Nueva Orden:')).length, 1);
        assert.equal(sent.filter((s) => s.startsWith('[ALERTA PAGO]')).length, 0);

        const hashLog = logs.flat().find((entry) => entry && entry.orderNumber === orderId);
        assert.equal(hashLog.amount, '36,800.00');
        assert.equal(hashLog.received, 'a'.repeat(64));
        assert.match(hashLog.computed, /^[0-9a-f]{64}$/);
        assert.notEqual(hashLog.computed, hashLog.received);
        const dumped = JSON.stringify(logs);
        assert.equal(dumped.includes(creds.TILOPAY_PASSWORD), false);
        assert.equal(dumped.includes(creds.TILOPAY_API_KEY), false);
        assert.equal(dumped.includes(base.email), false);
        assert.equal(dumped.includes(base.auth), false);
        assert.equal(dumped.includes('5221'), false);
        assert.equal(consultCalls.length >= 1, true);
        assert.equal(consultCalls[0].merchantId, '');
        assert.equal(consultCalls[0].orderNumber, orderId);

        const again = await call(confirm, approvedBody(orderId));
        assert.equal(again.status, 200);
        assert.equal(again.body.success, true);
        assert.equal(again.body.alreadyProcessed, true);
        assert.equal(betsyCalls.length, 1);
        assert.equal(resendCalls.length, 2);
      });
    } finally {
      console.info = prevInfo;
    }
  });

  test('Tilopay approved amount that does not match the snapshot is not paid', async () => {
    const orderId = 'ORD-1791071433200-1002';
    await withLiveFulfillment('mismatch', async ({ betsyCalls, resendCalls }) => {
      const first = await call(confirm, approvedBody(orderId));
      assert.equal(first.status, 200);
      assert.equal(first.body.success, false);
      assert.equal(first.body.paid, false);
      assert.equal(betsyCalls.length, 1);
      assert.equal(betsyCalls[0].payment.status, 'PENDIENTE');
      assert.equal(betsyCalls[0].metadata.paymentVerification, 'Pago tarjeta por verificar');
      assert.equal(subjects(resendCalls).filter((s) => s.startsWith('[ALERTA PAGO]')).length, 1);
      assert.equal(subjects(resendCalls).some((s) => s.startsWith('Confirmación de Pedido')), false);

      const again = await call(confirm, approvedBody(orderId));
      assert.equal(again.body.alreadyProcessed, true);
      assert.equal(betsyCalls.length, 1);
      assert.equal(resendCalls.length, 1);
    });
  });

  test('forged code=1 on a declined Tilopay capture is not paid', async () => {
    const orderId = 'ORD-1791071433500-1005';
    await withLiveFulfillment('declined', async ({ betsyCalls, resendCalls, consultCalls }) => {
      const first = await call(confirm, approvedBody(orderId));
      assert.equal(first.status, 200);
      assert.equal(first.body.success, false);
      assert.equal(first.body.paid, false);
      assert.equal(consultCalls.length, 1);
      assert.equal(betsyCalls.length, 1);
      assert.equal(betsyCalls[0].payment.status, 'PENDIENTE');
      assert.equal(betsyCalls[0].metadata.paymentVerification, 'Pago tarjeta por verificar');
      assert.equal(subjects(resendCalls).some((s) => s.startsWith('Confirmación de Pedido') || s.startsWith('Nueva Orden:')), false);
      assert.equal(subjects(resendCalls).filter((s) => s.startsWith('[ALERTA PAGO]')).length, 1);
    });
  });

  test('Tilopay API down leaves the order por verificar and does not send a paid email', async () => {
    const orderId = 'ORD-1791071433600-1006';
    await withLiveFulfillment('down', async ({ betsyCalls, resendCalls, consultCalls }) => {
      const first = await call(confirm, approvedBody(orderId));
      assert.equal(first.status, 200);
      assert.equal(first.body.success, true);
      assert.equal(first.body.pending, true);
      assert.equal(first.body.review, true);
      assert.equal(consultCalls.length, 0);
      assert.equal(betsyCalls.length, 1);
      assert.equal(betsyCalls[0].payment.status, 'PENDIENTE');
      assert.equal(betsyCalls[0].metadata.paymentVerification, 'Pago tarjeta por verificar');
      assert.equal(subjects(resendCalls).some((s) => s.startsWith('Confirmación de Pedido')), false);
      assert.equal(subjects(resendCalls).filter((s) => s.startsWith('[ALERTA PAGO]')).length, 1);
    });
  });

  test('forged returnData is not processed and alerts the owner', async () => {
    const orderId = 'ORD-1791071433300-1003';
    await withLiveFulfillment('ok', async ({ betsyCalls, resendCalls }) => {
      const body = approvedBody(orderId);
      const sig = body.returnData.split('.')[1];
      const tampered = Buffer.from(JSON.stringify({ ...customer(orderId), total: 1 })).toString('base64url');
      const forged = await call(confirm, { ...body, returnData: `${tampered}.${sig}` });
      assert.equal(forged.status, 400);
      assert.equal(forged.body.success, false);
      assert.equal(betsyCalls.length, 0);
      const sent = subjects(resendCalls);
      assert.equal(sent.filter((s) => s.startsWith('[ALERTA PAGO]')).length, 1);
      assert.equal(sent.some((s) => s.startsWith('Nueva Orden:') || s.startsWith('Confirmación de Pedido')), false);
    });
  });

  test('Betsy failure alerts the owner and a reload does not duplicate', async () => {
    const orderId = 'ORD-1791071433400-1004';
    await withLiveFulfillment('fail', async ({ betsyCalls, resendCalls }) => {
      const first = await call(confirm, approvedBody(orderId));
      assert.equal(first.status, 200);
      assert.equal(first.body.success, true);
      assert.equal(betsyCalls.length, 2);
      assert.equal(subjects(resendCalls).filter((s) => s.startsWith('[ALERTA PAGO]')).length, 1);
      assert.equal(subjects(resendCalls).filter((s) => s.startsWith('Nueva Orden:')).length, 1);

      const again = await call(confirm, approvedBody(orderId));
      assert.equal(again.body.alreadyProcessed, true);
      assert.equal(betsyCalls.length, 2);
      assert.equal(resendCalls.length, 3);
    });
  });
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
