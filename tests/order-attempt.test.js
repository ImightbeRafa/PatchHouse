import test from 'node:test';
import assert from 'node:assert/strict';
import { clearClientOrderId, clientOrderId } from '../src/js/lib/order-attempt.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key)
  };
}

const cart = [{ key: 'focus', qty: 1 }];
const contact = { email: 'Maria@Example.com', phone: '8888-1234', items: cart, total: 12900 };

test('double click reuses one order id; a new attempt after clear gets another', () => {
  const storage = memoryStorage();
  let tick = 1791071433000;
  const now = () => tick;
  const rand = () => 0.1;
  const first = clientOrderId(storage, { ...contact, method: 'card', now, rand });
  tick += 1;
  const second = clientOrderId(storage, { ...contact, method: 'card', now, rand });
  assert.equal(second, first);

  clearClientOrderId(storage);
  tick += 1;
  const afterDecline = clientOrderId(storage, { ...contact, method: 'sinpe', now, rand });
  assert.notEqual(afterDecline, first);
  assert.match(afterDecline, /^ORD-\d{10,}-\d{4}$/);
});

test('card then SINPE do not share an id even before the stored id is cleared', () => {
  const storage = memoryStorage();
  const card = clientOrderId(storage, { ...contact, method: 'card', now: () => 1791071433000, rand: () => 0.2 });
  const sinpe = clientOrderId(storage, { ...contact, method: 'sinpe', now: () => 1791071433001, rand: () => 0.2 });
  assert.notEqual(sinpe, card);
});
