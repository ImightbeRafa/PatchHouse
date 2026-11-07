import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCrPhone, normalizeCrPhone } from '../shared/anti-troll/phone.js';
import { isValidEmailSyntax, suggestEmailFix } from '../shared/anti-troll/email.js';
import { checkEmail, domainAcceptsMail, isDisposableDomain, verifyTurnstile, turnstileConfig, runOrderChecks, setOrderCheckDeps } from '../shared/anti-troll/server.js';

const err = (code) => Object.assign(new Error(code), { code });
/** Fake resolver from a table: domain -> { mx, a, aaaa } where each is records[] or an error code string. */
function resolver(table) {
  const get = (kind) => async (d) => {
    const v = table[d]?.[kind] ?? 'ENOTFOUND';
    if (typeof v === 'string') throw err(v);
    if (v === 'hang') return new Promise(() => {});
    return v;
  };
  return { resolveMx: get('mx'), resolve4: get('a'), resolve6: get('aaaa') };
}

/* ---------- phone ---------- */
test('phone: accepts CR formats', () => {
  for (const v of ['8712-3456', '87123456', '+506 8712 3456', '506-8712-3456', '00506 87123456', '2234 5678', '(506) 6012-3456', '4000-1122', '5123-9876', '7012-3344']) {
    assert.equal(checkCrPhone(v).ok, true, v);
  }
  assert.equal(normalizeCrPhone('+506 8712-3456'), '87123456');
});

test('phone: rejects wrong length, bad prefix and obvious fakes with Spanish messages', () => {
  const cases = { '': 'empty', '8712345': 'length', '871234567': 'length', '1712-3456': 'prefix', '3712-3456': 'prefix', '9712-3456': 'prefix', '0712-3456': 'prefix',
    '8888-8888': 'fake', '2222 2222': 'fake', '+506 7777-7777': 'fake', '2345-6789': 'fake', '8765-4321': 'fake', '7654 3210': 'fake' };
  for (const [v, reason] of Object.entries(cases)) {
    const r = checkCrPhone(v);
    assert.equal(r.ok, false, v);
    assert.equal(r.reason, reason, v);
    assert.match(r.message, /[áéíóú]|número|Escribí|Usá/, v);
  }
  assert.equal(checkCrPhone('1234-5678').ok, false);
});

/* ---------- email syntax + typos ---------- */
test('email: syntax', () => {
  for (const ok of ['maria@gmail.com', 'ana.mora+tienda@ice.co.cr', 'x_y@sub.domain.cr']) assert.equal(isValidEmailSyntax(ok), true, ok);
  for (const bad of ['', 'maria', 'maria@', '@gmail.com', 'maria@gmail', 'ma ria@gmail.com', 'maria@@gmail.com', '.maria@gmail.com', 'ma..ria@gmail.com', 'maria@-x.com', 'maria@gmail.c']) {
    assert.equal(isValidEmailSyntax(bad), false, bad);
  }
});

test('email: typo suggestions never fire on correct domains', () => {
  assert.equal(suggestEmailFix('ana@gmial.com'), 'ana@gmail.com');
  assert.equal(suggestEmailFix('ana@hotmal.com'), 'ana@hotmail.com');
  assert.equal(suggestEmailFix('ana@gmail.con'), 'ana@gmail.com');
  assert.equal(suggestEmailFix('ana@outlok.com'), 'ana@outlook.com');
  assert.equal(suggestEmailFix('ana@yaho.com'), 'ana@yahoo.com');
  assert.equal(suggestEmailFix('ana@gmail.com'), null);
  assert.equal(suggestEmailFix('ana@empresa.cr'), null);
  assert.equal(suggestEmailFix('ana@ice.co.cr'), null);
  assert.equal(suggestEmailFix('no-at-sign'), null);
});

/* ---------- disposable ---------- */
test('disposable list: loaded from data file, matches subdomains, leaves real providers alone', () => {
  assert.equal(isDisposableDomain('mailinator.com'), true);
  assert.equal(isDisposableDomain('inbox.mailinator.com'), true);
  assert.equal(isDisposableDomain('yopmail.com'), true);
  for (const real of ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'ice.co.cr']) assert.equal(isDisposableDomain(real), false, real);
});

/* ---------- DNS (mocked) ---------- */
test('dns: MX ok, A fallback, null MX, nonexistent, fail-open on SERVFAIL/timeout', async () => {
  const r = resolver({
    'mx.cr': { mx: [{ exchange: 'mail.mx.cr', priority: 10 }] },
    'aonly.cr': { mx: 'ENODATA', a: ['1.2.3.4'] },
    'v6only.cr': { mx: 'ENODATA', a: 'ENODATA', aaaa: ['::1'] },
    'nullmx.cr': { mx: [{ exchange: '.', priority: 0 }] },
    'broken.cr': { mx: 'ESERVFAIL' },
    'slow.cr': { mx: 'hang' },
    'afail.cr': { mx: 'ENODATA', a: 'ETIMEOUT' }
  });
  assert.equal(await domainAcceptsMail('mx.cr', { resolver: r }), 'ok');
  assert.equal(await domainAcceptsMail('aonly.cr', { resolver: r }), 'ok');
  assert.equal(await domainAcceptsMail('v6only.cr', { resolver: r }), 'ok');
  assert.equal(await domainAcceptsMail('nullmx.cr', { resolver: r }), 'missing');
  assert.equal(await domainAcceptsMail('nope.cr', { resolver: r }), 'missing');
  assert.equal(await domainAcceptsMail('broken.cr', { resolver: r }), 'unknown');
  assert.equal(await domainAcceptsMail('afail.cr', { resolver: r }), 'unknown');
  assert.equal(await domainAcceptsMail('slow.cr', { resolver: r, timeoutMs: 30 }), 'unknown');

  assert.deepEqual(await checkEmail('ana@mx.cr', { resolver: r }), { ok: true });
  assert.equal((await checkEmail('ana@nope.cr', { resolver: r })).reason, 'domain');
  assert.equal((await checkEmail('ana@nullmx.cr', { resolver: r })).reason, 'domain');
  assert.deepEqual(await checkEmail('ana@broken.cr', { resolver: r }), { ok: true, failOpen: true });
  assert.deepEqual(await checkEmail('ana@slow.cr', { resolver: r, timeoutMs: 30 }), { ok: true, failOpen: true });
  assert.equal((await checkEmail('ana@mailinator.com', { resolver: r })).reason, 'disposable');
  assert.equal((await checkEmail('ana@', { resolver: r })).reason, 'syntax');
});

/* ---------- Turnstile ---------- */
const reply = (body, ok = true, status = 200) => async () => ({ ok, status, json: async () => body });

test('turnstile: off when either key is missing', async () => {
  assert.equal(turnstileConfig({}).enabled, false);
  assert.equal(turnstileConfig({ TURNSTILE_SITE_KEY: 'a' }).enabled, false);
  assert.equal(turnstileConfig({ TURNSTILE_SECRET: 'b' }).enabled, false);
  assert.equal(turnstileConfig({ TURNSTILE_SITE_KEY: 'a', TURNSTILE_SECRET: 'b' }).enabled, true);
  assert.deepEqual(await verifyTurnstile('', { secret: '' }), { ok: true, skipped: true });
});

test('turnstile: on, pass / invalid / missing token', async () => {
  assert.deepEqual(await verifyTurnstile('t', { secret: 's', fetchImpl: reply({ success: true }) }), { ok: true });
  const bad = await verifyTurnstile('t', { secret: 's', fetchImpl: reply({ success: false, 'error-codes': ['invalid-input-response'] }) });
  assert.equal(bad.ok, false);
  assert.match(bad.message, /persona/);
  assert.equal((await verifyTurnstile('t', { secret: 's', fetchImpl: reply({ success: false, 'error-codes': ['timeout-or-duplicate'] }) })).ok, false);
  assert.equal((await verifyTurnstile('', { secret: 's', fetchImpl: reply({ success: true }) })).reason, 'missing-token');
});

test('turnstile: fails open on outage, timeout, HTTP 5xx and our-side config errors', async () => {
  const open = { ok: true, failOpen: true };
  assert.deepEqual(await verifyTurnstile('t', { secret: 's', fetchImpl: async () => { throw new Error('ECONNRESET'); } }), open);
  assert.deepEqual(await verifyTurnstile('t', { secret: 's', fetchImpl: reply({}, false, 503) }), open);
  assert.deepEqual(await verifyTurnstile('t', { secret: 's', fetchImpl: reply({ success: false, 'error-codes': ['internal-error'] }) }), open);
  assert.deepEqual(await verifyTurnstile('t', { secret: 's', fetchImpl: reply({ success: false, 'error-codes': ['invalid-input-secret'] }) }), open);
  const hang = (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  const keepAlive = setTimeout(() => {}, 1000); // AbortSignal.timeout is unref'd; keep the loop alive for the test
  assert.deepEqual(await verifyTurnstile('t', { secret: 's', fetchImpl: hang, timeoutMs: 30 }), open);
  clearTimeout(keepAlive);
});

test('runOrderChecks: skips email when empty (SINPE allows none), returns handler-ready errors', async () => {
  setOrderCheckDeps({ env: {}, resolver: resolver({ 'mx.cr': { mx: [{ exchange: 'm', priority: 1 }] } }) });
  try {
    assert.deepEqual(await runOrderChecks({ email: '' }), { ok: true });
    assert.deepEqual(await runOrderChecks({ email: 'a@mx.cr' }), { ok: true });
    const r = await runOrderChecks({ email: 'a@nope.cr' });
    assert.equal(r.status, 400);
    assert.deepEqual(r.body.missingFields, ['email']);
    setOrderCheckDeps({ env: { ORDER_CHECKS_DNS: 'off' } });
    assert.deepEqual(await runOrderChecks({ email: 'a@nope.cr' }), { ok: true });
  } finally { setOrderCheckDeps({}); }
});
