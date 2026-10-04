/**
 * Tamper-proofing for the order snapshot that travels through Tilopay (returnData).
 * Format: base64url(JSON) + "." + hex HMAC-SHA256. Without a valid signature an order
 * cannot be fulfilled, so a customer cannot invent or edit order data in the redirect URL.
 */
import crypto from 'node:crypto';

function secret() {
  return process.env.ORDER_SIGNING_SECRET || process.env.TILOPAY_WEBHOOK_SECRET || process.env.TILOPAY_API_KEY || '';
}

export function hasSigningSecret() {
  return Boolean(secret());
}

function mac(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

export function signOrder(order) {
  if (!secret()) throw new Error('No signing secret configured (ORDER_SIGNING_SECRET or TILOPAY_WEBHOOK_SECRET)');
  const payload = Buffer.from(JSON.stringify(order), 'utf8').toString('base64url');
  return `${payload}.${mac(payload)}`;
}

/** @returns the order object, or throws if the token is malformed or the signature is wrong. */
export function verifyOrderToken(token) {
  const [payload, sig, extra] = String(token || '').split('.');
  if (!payload || !sig || extra !== undefined || !secret()) throw new Error('Unsigned or malformed order data');
  const expected = Buffer.from(mac(payload), 'hex');
  const given = Buffer.from(sig, 'hex');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) throw new Error('Invalid order signature');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}
