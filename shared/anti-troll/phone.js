/**
 * Costa Rica phone check. Pure, browser + server safe.
 * Accepts 8 digits with optional +506 / 506 / 00506 prefix, spaces, dashes, dots or parentheses.
 */

const VALID_FIRST_DIGITS = new Set(['2', '4', '5', '6', '7', '8']);

/** Strips formatting and the CR country code. Returns digits only (may not be 8 long). */
export function normalizeCrPhone(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.startsWith('00506')) digits = digits.slice(5);
  else if (digits.length === 11 && digits.startsWith('506')) digits = digits.slice(3);
  return digits;
}

/** True for 11111111-style numbers and straight ascending/descending runs (12345678, 87654321, 23456789...). */
export function isObviousFakePhone(digits) {
  if (/^(\d)\1+$/.test(digits)) return true;
  let up = true;
  let down = true;
  for (let i = 1; i < digits.length; i += 1) {
    const diff = Number(digits[i]) - Number(digits[i - 1]);
    if (diff !== 1) up = false;
    if (diff !== -1) down = false;
  }
  return up || down;
}

/**
 * @returns {{ ok: true, digits: string } | { ok: false, reason: 'empty'|'length'|'prefix'|'fake', message: string }}
 */
export function checkCrPhone(value) {
  if (!String(value ?? '').trim()) return { ok: false, reason: 'empty', message: 'Escribí tu número de teléfono.' };
  const digits = normalizeCrPhone(value);
  if (digits.length !== 8) return { ok: false, reason: 'length', message: 'Usá un número de 8 dígitos, ej. 8712-3456.' };
  if (!VALID_FIRST_DIGITS.has(digits[0])) {
    return { ok: false, reason: 'prefix', message: 'Ese número no parece de Costa Rica: debe empezar con 2, 4, 5, 6, 7 u 8.' };
  }
  if (isObviousFakePhone(digits)) return { ok: false, reason: 'fake', message: 'Revisá tu número de teléfono, parece incorrecto.' };
  return { ok: true, digits };
}
