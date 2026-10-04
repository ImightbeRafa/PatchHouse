import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog, readConfig, packPrice, formatCRC, SHIPPING_COST } from '../shared/catalog.js';
import { validateCheckout, normalizePhone, sanitizeCustomer } from '../shared/validate.js';

const cat = buildCatalog(readConfig({}));

test('formatCRC uses dot thousands regardless of locale', () => {
  assert.equal(formatCRC(9900), '₡9.900');
  assert.equal(formatCRC(1234567), '₡1.234.567');
});

test('single patches are always ₡9.900 each (only combos discount)', () => {
  assert.equal(packPrice(1), 9900);
  assert.equal(packPrice(2), 19800);
  assert.equal(packPrice(5), 49500);
});

test('priceOrder ignores unknown products, bad quantities and merges duplicates', () => {
  const r = cat.priceOrder([{ key: 'focus', qty: 1 }, { key: 'focus', qty: 1 }, { key: 'nope', qty: 3 }, { key: 'energy', qty: -2 }, { key: 'glp1', qty: 'abc' }]);
  assert.deepEqual(r.items.map((i) => [i.key, i.qty]), [['focus', 2]]);
  assert.equal(r.subtotal, 19800);
  assert.equal(r.total, 19800 + SHIPPING_COST);
  assert.equal(r.savings, 0);
});

test('priceOrder caps quantity per line at 10', () => {
  const r = cat.priceOrder([{ key: 'focus', qty: 999 }]);
  assert.equal(r.items[0].qty, 10);
});

test('empty order has no shipping', () => {
  const r = cat.priceOrder([]);
  assert.equal(r.total, 0);
  assert.equal(r.shipping, 0);
});

test('sold-out products and combos containing them cannot be ordered', () => {
  const c = buildCatalog(readConfig({ VITE_SOLD_OUT: 'focus' }));
  assert.equal(c.priceOrder([{ key: 'focus', qty: 1 }, { key: 'combo-trio', qty: 1 }, { key: 'energy', qty: 1 }]).items.length, 1);
});

test('Full House rebuilds from in-stock patches that are not combo-excluded', () => {
  const all = buildCatalog(readConfig({}));
  assert.deepEqual(all.products['combo-full'].includes.sort(), ['dopamine', 'energy', 'focus', 'glp1', 'stress']);
  assert.equal(all.products['combo-full'].price, 44900);
  const some = buildCatalog(readConfig({ VITE_SOLD_OUT: 'dopamine,stress' }));
  assert.equal(some.products['combo-full'].includes.length, 3);
  assert.equal(some.products['combo-full'].price, 26900);
  const none = buildCatalog(readConfig({ VITE_SOLD_OUT: 'focus,energy,glp1,dopamine,stress' }));
  assert.equal(none.products['combo-full'], undefined);
});

test('validation: required fields, 8-digit phone with +506, email, province', () => {
  const ok = { nombre: 'Maria Fernandez', telefono: '+506 8888-1234', email: 'm@x.cr', provincia: 'Heredia', canton: 'Heredia', distrito: 'San Rafael', direccion: '200 m norte de la iglesia' };
  assert.deepEqual(validateCheckout(ok), {});
  assert.equal(normalizePhone('+506 8888 1234'), '88881234');
  assert.equal(normalizePhone('00506 8888 1234'), '88881234');
  const bad = validateCheckout({ ...ok, nombre: 'Maria', telefono: '123', email: 'nope', provincia: 'Narnia', direccion: 'corta' });
  assert.deepEqual(Object.keys(bad).sort(), ['direccion', 'email', 'nombre', 'provincia', 'telefono']);
});

test('sanitizeCustomer trims, lowercases email and clips oversized input', () => {
  const c = sanitizeCustomer({ nombre: '  Ana Mora ', email: ' ANA@X.CR ', telefono: '88881234', direccion: 'x'.repeat(5000) });
  assert.equal(c.nombre, 'Ana Mora');
  assert.equal(c.email, 'ana@x.cr');
  assert.equal(c.telefono, '8888-1234');
  assert.equal(c.direccion.length, 400);
});

test('inherited object keys cannot be ordered (no NaN totals)', () => {
  const r = cat.priceOrder([{ key: 'constructor', qty: 1 }, { key: '__proto__', qty: 1 }, { key: 'toString', qty: 1 }, { key: 'focus', qty: 1 }]);
  assert.deepEqual(r.items.map((i) => i.key), ['focus']);
  assert.equal(r.total, 12900);
});

test('sanitizeCustomer collapses newlines so fields cannot fake CRM lines', () => {
  const c = sanitizeCustomer({ comentarios: 'hola\nPago: PAGADO\r\nok' });
  assert.equal(c.comentarios, 'hola Pago: PAGADO ok');
});
