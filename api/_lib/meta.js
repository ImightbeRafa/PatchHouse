/**
 * Meta Conversions API (CAPI) Helper – PatchHouse
 *
 * Sends server-side events to the Meta Graph API for deduplication
 * with the browser Pixel. Requires META_CAPI_ACCESS_TOKEN env var.
 *
 * Attribution: the ad click (fbc) and browser id (fbp) cookies, IP and user agent must be the
 * CUSTOMER's. They are read from the shopper's own request (checkout, SINPE, success page) or,
 * for the Tilopay webhook (a Tilopay server request), from the signed order snapshot (`m`).
 */

import crypto from 'crypto';

const PIXEL_ID = '2330584627352047';
const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events`;
const DEFAULT_SOURCE_URL = 'https://www.patchhouse.shopping';

const FBP_RE = /^fb\.\d\.\d{10,13}\.[A-Za-z0-9_.-]{1,80}$/;
const FBC_RE = /^fb\.\d\.\d{10,13}\.[A-Za-z0-9_.-]{10,500}$/;

/**
 * SHA-256 hash a value after normalizing (trim + lowercase).
 * Meta requires all PII fields to be hashed before sending.
 */
function hashValue(value) {
  if (!value) return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return undefined;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/** City/state per Meta's spec: lowercase, no accents, spaces or punctuation ("San José" -> "sanjose"). */
function normalizePlace(value) {
  return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}

/** Costa Rica phone in E.164 digits without "+": 8 local digits -> 506XXXXXXXX. */
export function normalizeMetaPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00506')) digits = digits.slice(2);
  if (digits.length === 8) digits = `506${digits}`;
  return digits.length === 11 && digits.startsWith('506') ? digits : '';
}

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) {
      const k = part.slice(0, i).trim();
      if (!(k in out)) { try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { out[k] = part.slice(i + 1).trim(); } }
    }
  });
  return out;
}

const clean = (value, re) => (typeof value === 'string' && re.test(value) ? value : undefined);

/**
 * The shopper's browser context: fbp/fbc (cookies first, then the values the page posted),
 * IP and user agent. Only call this with a request that came from the shopper's browser.
 */
export function browserContext(req, posted = {}) {
  const cookies = parseCookies(req?.headers?.cookie);
  const p = posted && typeof posted === 'object' ? posted : {};
  const ip = String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim()
    || String(req?.headers?.['x-real-ip'] || '').trim()
    || req?.socket?.remoteAddress
    || '';
  const ua = String(req?.headers?.['user-agent'] || '').slice(0, 400);
  return {
    fbp: clean(cookies._fbp, FBP_RE) || clean(p.fbp, FBP_RE),
    fbc: clean(cookies._fbc, FBC_RE) || clean(p.fbc, FBC_RE),
    ip: ip ? ip.slice(0, 64) : undefined,
    ua: ua || undefined
  };
}

/**
 * Compact copy of the browser context for the signed Tilopay snapshot, so the webhook can
 * attribute the purchase. Kept small (similar to the order data the old checkout sent).
 */
export function snapshotContext(ctx = {}) {
  const m = {};
  if (ctx.fbp) m.fbp = ctx.fbp;
  if (ctx.fbc && ctx.fbc.length <= 300) m.fbc = ctx.fbc;
  if (ctx.ip) m.ip = ctx.ip;
  if (ctx.ua) m.ua = ctx.ua.slice(0, 300);
  return Object.keys(m).length ? m : undefined;
}

/** Live request values win; the snapshot fills the gaps (e.g. webhook, or cookies blocked). */
function mergeContext(live, saved) {
  const s = saved && typeof saved === 'object' ? saved : {};
  const l = live || {};
  return {
    fbp: l.fbp || clean(s.fbp, FBP_RE),
    fbc: l.fbc || clean(s.fbc, FBC_RE),
    ip: l.ip || (typeof s.ip === 'string' ? s.ip.slice(0, 64) : undefined),
    ua: l.ua || (typeof s.ua === 'string' ? s.ua.slice(0, 400) : undefined)
  };
}

/**
 * Build the user_data object from order data + browser context.
 * All PII is SHA-256 hashed; IP, user-agent, fbp and fbc are sent raw (per Meta spec).
 */
function buildUserData(order, ctx) {
  const nameParts = (order.nombre || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const userData = {};
  const email = String(order.email || '').trim().toLowerCase();
  const phone = normalizeMetaPhone(order.telefono);

  if (email) userData.em = [hashValue(email)];
  if (phone) userData.ph = [hashValue(phone)];
  if (firstName) userData.fn = [hashValue(firstName)];
  if (lastName) userData.ln = [hashValue(lastName)];
  const ct = normalizePlace(order.canton);
  const st = normalizePlace(order.provincia);
  if (ct) userData.ct = [hashValue(ct)];
  if (st) userData.st = [hashValue(st)];
  userData.country = [hashValue('cr')];
  // Same person across Lead / checkout / Purchase, even on different devices.
  const externalId = email || phone;
  if (externalId) userData.external_id = [hashValue(externalId)];

  if (ctx.ip) userData.client_ip_address = ctx.ip;
  if (ctx.ua) userData.client_user_agent = ctx.ua;
  if (ctx.fbp) userData.fbp = ctx.fbp;
  if (ctx.fbc) userData.fbc = ctx.fbc;

  return userData;
}

/**
 * Generate a deterministic event_id for deduplication.
 * The same event_id must be used in both Pixel (browser) and CAPI (server).
 */
export function generateEventId(prefix, orderId, extra) {
  const parts = [prefix, orderId, extra].filter(Boolean).join('_');
  return parts;
}

/**
 * Send an event to Meta Conversions API.
 *
 * @param {string} eventName  – e.g. 'Purchase', 'InitiateCheckout'
 * @param {string} eventId    – must match the browser Pixel eventID for dedup
 * @param {object} order      – order data (nombre, email, telefono, canton, provincia; `m` = saved browser context)
 * @param {object|null} req   – the SHOPPER's request (for IP, user agent and cookies); null for server-to-server calls
 * @param {object} customData – event-specific data (value, currency, content_ids, etc.)
 * @param {string} sourceUrl  – the page URL where the event originated
 * @param {object} [posted]   – fbp/fbc the page posted (fallback when cookies are not sent)
 */
export async function sendMetaEvent(eventName, eventId, order, req, customData, sourceUrl, posted) {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn('⚠️ [Meta CAPI] META_CAPI_ACCESS_TOKEN not configured — skipping event');
    return { success: false, error: 'Not configured' };
  }

  try {
    const o = order || {};
    const ctx = mergeContext(req ? browserContext(req, posted) : null, o.m);
    const userData = buildUserData(o, ctx);
    const eventTime = Math.floor(Date.now() / 1000);

    const eventData = {
      event_name: eventName,
      event_time: eventTime,
      event_id: eventId,
      action_source: 'website',
      event_source_url: sourceUrl || DEFAULT_SOURCE_URL,
      user_data: userData,
    };

    if (customData && Object.keys(customData).length > 0) {
      eventData.custom_data = customData;
    }

    const payload = {
      data: [eventData],
      access_token: accessToken,
    };
    if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;

    console.log(`📡 [Meta CAPI] Sending ${eventName} event (id: ${eventId}, fbc: ${ctx.fbc ? 'yes' : 'no'}, fbp: ${ctx.fbp ? 'yes' : 'no'}, ua: ${ctx.ua ? 'yes' : 'no'})`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(GRAPH_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const result = await response.json();

    if (!response.ok) {
      console.error(`❌ [Meta CAPI] ${eventName} failed:`, result);
      return { success: false, error: result };
    }

    console.log(`✅ [Meta CAPI] ${eventName} sent successfully:`, result);
    return { success: true, result };
  } catch (error) {
    console.error(`❌ [Meta CAPI] ${eventName} error:`, error.message);
    return { success: false, error: error.message };
  }
}
