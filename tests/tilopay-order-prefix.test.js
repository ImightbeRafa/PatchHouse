import test from 'node:test';
import assert from 'node:assert/strict';

const creds = { TILOPAY_API_KEY: 'KEY-123', TILOPAY_USER: 'apiuser', TILOPAY_PASSWORD: 'pw', TILOPAY_BASE_URL: 'https://tilopay.test/api/v1' };
Object.assign(process.env, creds);
const lib = await import('../api/_lib/tilopay.js');
const { tilopayOrderMatches, tilopayTransactionMatches } = lib;
const OURS = 'ORDC-1792460390655-1999';

function stubConsult(rows) {
  const real = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const body = String(url).endsWith('/login') ? { access_token: 'tok' } : { response: rows };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  return () => { globalThis.fetch = real; };
}
const row = (over = {}) => ({ orderNumber: `PFC000830-${OURS}`, code: '1', amount: '12900.00', currency: 'CRC', id_tilopay: 6118950, ...over });

test('order matcher: exact and PFC<digits> prefix', () => {
  assert.equal(tilopayOrderMatches(OURS, OURS), true);
  assert.equal(tilopayOrderMatches(`PFC000830-${OURS}`, OURS), true);
  assert.equal(tilopayOrderMatches(`PFC-${OURS}`, OURS), true);
  assert.equal(tilopayOrderMatches(`PFC${OURS}`, OURS), true);
});

test('order matcher: rejects other orders and loose prefixes', () => {
  assert.equal(tilopayOrderMatches(`PFC000830-${OURS}9`, OURS), false);
  assert.equal(tilopayOrderMatches(`XPFC000830-${OURS}`, OURS), false);
  assert.equal(tilopayOrderMatches(`PFCAB-${OURS}`, OURS), false);
  assert.equal(tilopayOrderMatches(`PFC000830-1-${OURS}`, OURS), false);
  assert.equal(tilopayOrderMatches('PFC000830-ORDC-1792460390655-1998', OURS), false);
  assert.equal(tilopayOrderMatches('', OURS), false);
  assert.equal(tilopayOrderMatches(OURS, ''), false);
  assert.equal(tilopayOrderMatches('PFC1-ORDXC-1', 'ORD.C-1'), false, 'regex chars are escaped');
});

test('transaction matcher: required only when we have one', () => {
  assert.equal(tilopayTransactionMatches(row(), ''), true);
  assert.equal(tilopayTransactionMatches(row(), undefined), true);
  assert.equal(tilopayTransactionMatches(row(), '6118950'), true);
  assert.equal(tilopayTransactionMatches(row(), '999'), false);
});

test('consult: prefixed approved row is approved (real 2026-10-19 shape)', async () => {
  const restore = stubConsult([row()]);
  try {
    const rows = await lib.consultTilopayOrder(OURS, process.env, '6118950');
    assert.equal(rows.length, 1); assert.equal(lib.hasApprovedTilopayCapture(rows, 12900), true);
  } finally { restore(); }
});
test('consult: wrong tx / other order dropped, amount and code still checked', async () => {
  let restore = stubConsult([row()]);
  try { assert.equal((await lib.consultTilopayOrder(OURS, process.env, '1')).length, 0); } finally { restore(); }
  restore = stubConsult([row({ orderNumber: 'PFC000830-ORDC-1-1' })]);
  try { assert.equal(lib.hasApprovedTilopayCapture(await lib.consultTilopayOrder(OURS, process.env), 12900), false); } finally { restore(); }
  restore = stubConsult([row({ amount: '100.00' })]);
  try { assert.equal(lib.hasApprovedTilopayCapture(await lib.consultTilopayOrder(OURS, process.env), 12900), false); } finally { restore(); }
  restore = stubConsult([row({ code: '12' })]);
  try { assert.equal(lib.hasApprovedTilopayCapture(await lib.consultTilopayOrder(OURS, process.env), 12900), false); } finally { restore(); }
});
