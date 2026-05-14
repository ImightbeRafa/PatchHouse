export const SHIPPING_COST = 3000;

const SINGLE_PATCH_PRICE = 9900;
const SINGLE_PATCH_KEYS = ['focus', 'nad', 'energy', 'glp1', 'dopamine', 'stress'];
const SINGLE_PATCH_PRODUCTS = {
  focus: { name: 'Focus Patch - 30 parches', price: SINGLE_PATCH_PRICE },
  nad: { name: 'NAD Patch - 30 parches', price: SINGLE_PATCH_PRICE },
  energy: { name: 'Energy Patch - 30 parches', price: SINGLE_PATCH_PRICE },
  glp1: { name: 'GLP-1 Patch - 30 parches', price: SINGLE_PATCH_PRICE },
  dopamine: { name: 'Dopamine Patch - 30 parches', price: SINGLE_PATCH_PRICE },
  stress: { name: 'Stress Relief Patch - 30 parches', price: SINGLE_PATCH_PRICE }
};

const STATIC_COMBO_PRODUCTS = {
  'combo-energia-foco': { name: 'Combo Energia & Foco (Energy + Focus)', price: 17900 },
  'combo-metabolismo': { name: 'Combo Metabolismo & Energia (GLP-1 + Energy)', price: 17900 },
  'combo-mood': { name: 'Combo Mood & Calma (Dopamine + Stress)', price: 17900 },
  'combo-foco-calma': { name: 'Combo Foco & Calma (Focus + Stress)', price: 17900 },
  'combo-trio': { name: 'Combo Trio Bienestar (Focus + GLP-1 + Stress)', price: 26900 }
};

const STATIC_COMBO_CONTENTS = {
  'combo-energia-foco': ['energy', 'focus'],
  'combo-metabolismo': ['glp1', 'energy'],
  'combo-mood': ['dopamine', 'stress'],
  'combo-foco-calma': ['focus', 'stress'],
  'combo-trio': ['focus', 'glp1', 'stress']
};

const FULL_HOUSE_PRICE_BY_COUNT = {
  2: 17900,
  3: 26900,
  4: 35900,
  5: 44900,
  6: 49900
};

function parseEnvList(value) {
  return String(value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

const SOLD_OUT = parseEnvList(process.env.VITE_SOLD_OUT || process.env.SOLD_OUT || '');
const COMBO_EXCLUDED = parseEnvList(process.env.VITE_COMBO_EXCLUDED || process.env.COMBO_EXCLUDED || 'nad');

function getEnvPriceForCount(count) {
  const value = process.env[`FULL_HOUSE_PRICE_${count}`] || process.env[`VITE_FULL_HOUSE_PRICE_${count}`];
  const price = Number.parseInt(value, 10);
  return Number.isFinite(price) && price > 0 ? price : null;
}

export function getAvailableFullHousePatchKeys() {
  return SINGLE_PATCH_KEYS.filter(key => !SOLD_OUT.includes(key) && !COMBO_EXCLUDED.includes(key));
}

function getFullHouseProduct() {
  const patchCount = getAvailableFullHousePatchKeys().length;
  if (patchCount < 2) return null;

  const price = getEnvPriceForCount(patchCount) || FULL_HOUSE_PRICE_BY_COUNT[patchCount] || (patchCount * SINGLE_PATCH_PRICE);
  return {
    name: `Combo Full House (${patchCount} paquetes)`,
    price
  };
}

const fullHouseProduct = getFullHouseProduct();

export const COMBO_CONTENTS = {
  ...STATIC_COMBO_CONTENTS,
  ...(fullHouseProduct ? { 'combo-full': getAvailableFullHousePatchKeys() } : {})
};

export const PRODUCTS = {
  ...SINGLE_PATCH_PRODUCTS,
  ...STATIC_COMBO_PRODUCTS,
  ...(fullHouseProduct ? { 'combo-full': fullHouseProduct } : {})
};

export function isSoldOut(productKey) {
  if (SOLD_OUT.includes(productKey)) return true;
  const contents = COMBO_CONTENTS[productKey];
  if (contents && contents.some(key => SOLD_OUT.includes(key))) return true;
  return false;
}

function toQty(value) {
  const qty = Number.parseInt(value, 10);
  return Number.isFinite(qty) && qty > 0 ? qty : 0;
}

export function getTrustedOrderItems(order = {}) {
  const rawItems = Array.isArray(order.items)
    ? order.items
    : order.producto
      ? [{ key: order.producto, qty: order.cantidad || 1 }]
      : [];

  return rawItems
    .map(item => {
      const key = item && item.key;
      const product = PRODUCTS[key];
      const qty = toQty(item && item.qty);
      if (!product || qty <= 0) return null;
      return {
        key,
        name: product.name,
        price: product.price,
        qty,
        lineTotal: product.price * qty
      };
    })
    .filter(Boolean);
}

export function normalizeTrustedOrder(order = {}) {
  const items = getTrustedOrderItems(order);
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shippingCost = items.length > 0 ? SHIPPING_COST : 0;
  const total = subtotal + shippingCost;

  return {
    ...order,
    items,
    subtotal,
    shippingCost,
    total
  };
}

export function findOrderTotalMismatch(order = {}) {
  const normalized = normalizeTrustedOrder(order);
  const suppliedSubtotal = Number(order.subtotal);
  const suppliedShipping = Number(order.shippingCost);
  const suppliedTotal = Number(order.total);

  const mismatches = [];
  if (Number.isFinite(suppliedSubtotal) && suppliedSubtotal !== normalized.subtotal) {
    mismatches.push(`subtotal supplied=${suppliedSubtotal} trusted=${normalized.subtotal}`);
  }
  if (Number.isFinite(suppliedShipping) && suppliedShipping !== normalized.shippingCost) {
    mismatches.push(`shipping supplied=${suppliedShipping} trusted=${normalized.shippingCost}`);
  }
  if (Number.isFinite(suppliedTotal) && suppliedTotal !== normalized.total) {
    mismatches.push(`total supplied=${suppliedTotal} trusted=${normalized.total}`);
  }

  return { normalized, mismatches };
}

export function decodeReturnData(returnData) {
  const decodedData = Buffer.from(returnData, 'base64').toString('utf-8');
  return JSON.parse(decodedData);
}
