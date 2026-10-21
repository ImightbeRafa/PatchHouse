/**
 * Server-only anti-troll checks for order submits (Node >= 20). Never import this from browser code.
 *
 * Fail-open policy: anything that is OUR problem (DNS timeout/SERVFAIL, Turnstile API down or slow,
 * missing keys) lets the order through and logs a warning. Only clear evidence of a bad submit
 * (bad syntax, domain does not exist, disposable domain, Turnstile says the token is invalid) blocks.
 */
import fs from 'node:fs';
import dnsPromises from 'node:dns/promises';
import { isValidEmailSyntax, emailDomain } from './email.js';

let deps = {};
const DNS_TIMEOUT_MS = 3000;
const TURNSTILE_TIMEOUT_MS = 4000;
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const MESSAGES = {
  emailSyntax: 'Revisá el correo, parece incompleto o mal escrito.',
  emailDomain: 'No encontramos el dominio de ese correo. Revisá que esté bien escrito (ej. nombre@gmail.com).',
  emailDisposable: 'No aceptamos correos temporales o desechables. Usá tu correo personal.',
  turnstile: 'No pudimos verificar que sos una persona. Recargá la página e intentá de nuevo; si sigue pasando, escribinos por WhatsApp.'
};

/* ---------- disposable domains ---------- */

let disposableSet = null;
/** Lazily loads data/disposable-domains.txt (one domain per line, # comments allowed). */
export function disposableDomains() {
  if (!disposableSet) {
    let text = '';
    try { text = fs.readFileSync(new URL('./data/disposable-domains.txt', import.meta.url), 'utf8'); }
    catch (e) { console.warn('[anti-troll] disposable list missing, skipping:', e.message); }
    disposableSet = new Set(text.split(/\r?\n/).map((l) => l.trim().toLowerCase()).filter((l) => l && !l.startsWith('#')));
  }
  return disposableSet;
}

/** Matches the domain or any parent (x.mailinator.com -> mailinator.com). */
export function isDisposableDomain(domain) {
  const set = disposableDomains();
  const parts = String(domain || '').toLowerCase().split('.');
  for (let i = 0; i < parts.length - 1; i += 1) if (set.has(parts.slice(i).join('.'))) return true;
  return false;
}

/* ---------- DNS ---------- */

const NOT_FOUND = new Set(['ENOTFOUND', 'ENODATA', 'NXDOMAIN']);
const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('dns timeout'), { code: 'ETIMEOUT' })), ms).unref?.())
]);

/**
 * @returns {Promise<'ok'|'missing'|'unknown'>} 'missing' only when DNS positively says there is no mail host.
 */
export async function domainAcceptsMail(domain, { resolver = dnsPromises, timeoutMs = DNS_TIMEOUT_MS } = {}) {
  const lookup = async (fn) => {
    try { return { records: await withTimeout(resolver[fn](domain), timeoutMs) }; }
    catch (e) { return { code: e && e.code }; }
  };
  const mx = await lookup('resolveMx');
  if (mx.records) {
    const real = mx.records.filter((r) => r && r.exchange && r.exchange !== '.');
    if (real.length) return 'ok';
    if (mx.records.length) return 'missing'; // RFC 7505 null MX: domain explicitly takes no mail
  } else if (!NOT_FOUND.has(mx.code)) {
    return 'unknown';
  }
  // No MX: RFC 5321 implicit MX falls back to the A/AAAA record.
  const a = await lookup('resolve4');
  if (a.records && a.records.length) return 'ok';
  if (!a.records && !NOT_FOUND.has(a.code)) return 'unknown';
  const aaaa = await lookup('resolve6');
  if (aaaa.records && aaaa.records.length) return 'ok';
  if (!aaaa.records && !NOT_FOUND.has(aaaa.code)) return 'unknown';
  return 'missing';
}

/**
 * @returns {Promise<{ ok: boolean, reason?: string, message?: string, failOpen?: boolean }>}
 */
export async function checkEmail(email, { resolver, timeoutMs, skipDns = false } = {}) {
  if (!isValidEmailSyntax(email)) return { ok: false, reason: 'syntax', message: MESSAGES.emailSyntax };
  const domain = emailDomain(email);
  if (isDisposableDomain(domain)) return { ok: false, reason: 'disposable', message: MESSAGES.emailDisposable };
  if (skipDns) return { ok: true };
  const status = await domainAcceptsMail(domain, { resolver, timeoutMs });
  if (status === 'missing') return { ok: false, reason: 'domain', message: MESSAGES.emailDomain };
  if (status === 'unknown') {
    console.warn('[anti-troll] DNS check inconclusive, allowing order (fail open):', domain);
    return { ok: true, failOpen: true };
  }
  return { ok: true };
}

/* ---------- Turnstile ---------- */

export function turnstileConfig(env = deps.env || process.env) {
  const siteKey = String(env.TURNSTILE_SITE_KEY || '').trim();
  const secret = String(env.TURNSTILE_SECRET || '').trim();
  return { siteKey, secret, enabled: Boolean(siteKey && secret) };
}

// Codes that mean Cloudflare/our config had a problem, not the visitor.
const TURNSTILE_OUR_FAULT = new Set(['missing-input-secret', 'invalid-input-secret', 'internal-error', 'bad-request']);

/**
 * @returns {Promise<{ ok: boolean, skipped?: boolean, failOpen?: boolean, reason?: string, message?: string }>}
 */
export async function verifyTurnstile(token, { secret, ip, fetchImpl = globalThis.fetch, timeoutMs = TURNSTILE_TIMEOUT_MS } = {}) {
  if (!secret) return { ok: true, skipped: true };
  if (!token || typeof token !== 'string' || token.length > 2048) {
    return { ok: false, reason: 'missing-token', message: MESSAGES.turnstile };
  }
  try {
    const form = new URLSearchParams({ secret, response: token });
    if (ip) form.set('remoteip', ip);
    const res = await fetchImpl(SITEVERIFY_URL, { method: 'POST', body: form, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`siteverify HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.success) return { ok: true };
    const codes = (data && data['error-codes']) || [];
    if (codes.some((c) => TURNSTILE_OUR_FAULT.has(c))) {
      console.warn('[anti-troll] Turnstile config/server error, allowing order (fail open):', codes.join(','));
      return { ok: true, failOpen: true };
    }
    return { ok: false, reason: codes[0] || 'invalid-token', message: MESSAGES.turnstile };
  } catch (e) {
    console.warn('[anti-troll] Turnstile unreachable, allowing order (fail open):', e && e.message);
    return { ok: true, failOpen: true };
  }
}

/* ---------- one call for order handlers ---------- */

export function clientIp(req) {
  const h = (req && req.headers) || {};
  return String(h['cf-connecting-ip'] || h['x-real-ip'] || String(h['x-forwarded-for'] || '').split(',')[0] || '').trim();
}

/** Test hook: inject { resolver, fetchImpl, env }. Call with {} to reset. */
export function setOrderCheckDeps(next = {}) { deps = next; }

/**
 * Runs after the regular field validation. Email is checked only when present (SINPE allows none).
 * @returns {Promise<{ ok: true } | { ok: false, status: number, body: object }>}
 */
export async function runOrderChecks({ email, turnstileToken, req } = {}) {
  const env = deps.env || process.env;
  const ts = turnstileConfig(env);
  const [tsResult, emailResult] = await Promise.all([
    ts.enabled
      ? verifyTurnstile(turnstileToken, { secret: ts.secret, ip: clientIp(req), fetchImpl: deps.fetchImpl })
      : Promise.resolve({ ok: true, skipped: true }),
    email
      ? checkEmail(email, { resolver: deps.resolver, skipDns: env.ORDER_CHECKS_DNS === 'off' })
      : Promise.resolve({ ok: true })
  ]);
  if (!tsResult.ok) {
    return { ok: false, status: 403, body: { error: 'verification_failed', message: tsResult.message } };
  }
  if (!emailResult.ok) {
    const errors = { email: emailResult.message };
    return { ok: false, status: 400, body: { error: 'Invalid fields', message: 'Revisá los campos marcados para continuar.', errors, missingFields: ['email'] } };
  }
  return { ok: true };
}
