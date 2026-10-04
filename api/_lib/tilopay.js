/**
 * Tilopay redirect verification (hashVersion V2).
 *
 * Mirrors Tilopay's official WooCommerce plugin (WCTilopay::computed_customer_hash):
 *   key    = `${tpt}|${apiKey}|${apiPassword}`
 *   params = http_build_query({ api_Key, api_user, orderId: tpt, external_orden_id, amount: number_format(amount, 2),
 *                               currency, responseCode, auth, email })
 *   OrderHash = hex(HMAC-SHA256(params, key))
 * The secret (API password) never reaches the browser, so a valid OrderHash proves Tilopay approved
 * this exact order number, amount and email.
 */
import crypto from 'node:crypto';

/** PHP urlencode(): like encodeURIComponent but also encodes !'()*~ and uses + for spaces. */
export function phpUrlencode(value) {
  return encodeURIComponent(String(value))
    .replace(/[!'()*~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+');
}

/** PHP number_format($n, 2): "39,800.00". */
export function phpNumberFormat2(n) {
  const [int, dec] = Number(n).toFixed(2).split('.');
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}`;
}

export function computeOrderHash({ tpt, orderNumber, amount, currency = 'CRC', code, auth, email }, creds = process.env) {
  const apiKey = creds.TILOPAY_API_KEY || '';
  const apiUser = creds.TILOPAY_USER || '';
  const apiPassword = creds.TILOPAY_PASSWORD || '';
  const params = [
    ['api_Key', apiKey],
    ['api_user', apiUser],
    ['orderId', tpt],
    ['external_orden_id', orderNumber],
    ['amount', phpNumberFormat2(amount)],
    ['currency', currency],
    ['responseCode', code],
    ['auth', auth],
    ['email', String(email || '').trim().toLowerCase()]
  ].map(([k, v]) => `${phpUrlencode(k)}=${phpUrlencode(v ?? '')}`).join('&');
  return crypto.createHmac('sha256', `${tpt}|${apiKey}|${apiPassword}`).update(params).digest('hex');
}

/** True only for an approved payment whose OrderHash matches what Tilopay would have signed. */
export function verifyTilopayRedirect({ orderHash, tpt, orderNumber, amount, code, auth, email }, creds = process.env) {
  const given = String(orderHash || '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(given) || !tpt || String(code) !== '1' || String(auth || '').length < 6) return false;
  if (!creds.TILOPAY_API_KEY || !creds.TILOPAY_PASSWORD) return false;
  const expected = computeOrderHash({ tpt, orderNumber, amount, code: '1', auth, email }, creds);
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(given, 'hex'));
}
