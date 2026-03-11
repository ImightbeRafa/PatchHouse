/**
 * Meta Conversions API (CAPI) Helper – PatchHouse
 *
 * Sends server-side events to the Meta Graph API for deduplication
 * with the browser Pixel. Requires META_CAPI_ACCESS_TOKEN env var.
 */

import crypto from 'crypto';

const PIXEL_ID = '2330584627352047';
const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events`;

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

/**
 * Build the user_data object from order/request data.
 * All PII is SHA-256 hashed; IP and user-agent are sent raw.
 */
function buildUserData(order, req) {
  const nameParts = (order.nombre || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const userData = {};

  if (order.email) userData.em = [hashValue(order.email)];
  if (order.telefono) {
    let phone = String(order.telefono).replace(/\D/g, '');
    if (!phone.startsWith('506')) phone = '506' + phone;
    userData.ph = [hashValue(phone)];
  }
  if (firstName) userData.fn = [hashValue(firstName)];
  if (lastName) userData.ln = [hashValue(lastName)];
  if (order.canton) userData.ct = [hashValue(order.canton)];
  if (order.provincia) userData.st = [hashValue(order.provincia)];
  userData.country = [hashValue('cr')];
  userData.zp = [hashValue('10101')];

  if (req) {
    const ip = req.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers?.['x-real-ip']
      || req.socket?.remoteAddress
      || '';
    if (ip) userData.client_ip_address = ip;

    const ua = req.headers?.['user-agent'] || '';
    if (ua) userData.client_user_agent = ua;
  }

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
 * @param {object} order      – order data (nombre, email, telefono, canton, provincia, etc.)
 * @param {object} req        – Express/Vercel request object (for IP + user-agent)
 * @param {object} customData – event-specific data (value, currency, content_ids, etc.)
 * @param {string} sourceUrl  – the page URL where the event originated
 */
export async function sendMetaEvent(eventName, eventId, order, req, customData, sourceUrl) {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn('⚠️ [Meta CAPI] META_CAPI_ACCESS_TOKEN not configured — skipping event');
    return { success: false, error: 'Not configured' };
  }

  try {
    const userData = buildUserData(order || {}, req);
    const eventTime = Math.floor(Date.now() / 1000);

    const eventData = {
      event_name: eventName,
      event_time: eventTime,
      event_id: eventId,
      action_source: 'website',
      event_source_url: sourceUrl || 'https://patchhouse.shopping',
      user_data: userData,
    };

    if (customData && Object.keys(customData).length > 0) {
      eventData.custom_data = customData;
    }

    const payload = {
      data: [eventData],
      access_token: accessToken,
    };

    console.log(`📡 [Meta CAPI] Sending ${eventName} event (id: ${eventId})`);

    const response = await fetch(GRAPH_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

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
