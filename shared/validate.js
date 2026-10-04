/**
 * Checkout validation shared by the browser (inline errors) and the API (authoritative check).
 * Pure functions only.
 */
import { PROVINCES } from './catalog.js';

export const FIELD_LABELS = {
  nombre: 'nombre y apellido',
  telefono: 'teléfono',
  email: 'correo electrónico',
  provincia: 'provincia',
  canton: 'cantón',
  distrito: 'distrito',
  direccion: 'dirección completa',
  metodo: 'método de pago'
};

/** Costa Rica numbers: 8 digits, optionally prefixed with +506 / 506 / 00506. */
export function normalizePhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00506')) digits = digits.slice(5);
  else if (digits.length === 11 && digits.startsWith('506')) digits = digits.slice(3);
  return digits;
}

export function formatPhone(value) {
  const d = normalizePhone(value);
  return d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4)}` : String(value || '').trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** @returns {Record<string,string>} field -> message (empty object when valid) */
export function validateCheckout(data = {}) {
  const errors = {};
  const get = (k) => String(data[k] ?? '').trim();

  const nombre = get('nombre');
  if (!nombre) errors.nombre = 'Escribí tu nombre completo.';
  else if (nombre.split(/\s+/).length < 2) errors.nombre = 'Incluí nombre y apellido.';

  if (!get('telefono')) errors.telefono = 'Escribí tu número de teléfono.';
  else if (normalizePhone(data.telefono).length !== 8) errors.telefono = 'Usá un número de 8 dígitos, ej. 8888-8888.';

  if (!get('email')) errors.email = 'Escribí tu correo electrónico.';
  else if (!EMAIL_RE.test(get('email'))) errors.email = 'Revisá el correo, parece incompleto.';

  if (!get('provincia')) errors.provincia = 'Seleccioná tu provincia.';
  else if (!PROVINCES.includes(get('provincia'))) errors.provincia = 'Provincia no válida.';

  if (!get('canton')) errors.canton = 'Escribí tu cantón.';
  if (!get('distrito')) errors.distrito = 'Escribí tu distrito.';

  if (!get('direccion')) errors.direccion = 'Escribí tu dirección completa.';
  else if (get('direccion').length < 10) errors.direccion = 'Agregá más detalle para que el mensajero te encuentre.';

  return errors;
}

/** Trims every string and caps lengths so oversized payloads never reach emails/CRM. */
export function sanitizeCustomer(data = {}) {
  // Single line: stops customers from injecting fake lines (e.g. "Estado: PAGADO") into CRM/email text.
  const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
  return {
    nombre: clip(data.nombre, 120),
    telefono: formatPhone(clip(data.telefono, 30)),
    email: clip(data.email, 160).toLowerCase(),
    provincia: clip(data.provincia, 30),
    canton: clip(data.canton, 80),
    distrito: clip(data.distrito, 80),
    direccion: clip(data.direccion, 400),
    comentarios: clip(data.comentarios, 600)
  };
}
