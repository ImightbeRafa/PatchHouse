export const PRODUCTS = {
  focus: { name: 'Focus Patch - 30 parches', price: 9900 },
  nad: { name: 'NAD Patch - 30 parches', price: 9900 },
  glp1: { name: 'GLP-1 Patch - 30 parches', price: 9900 },
  dopamine: { name: 'Dopamine Patch - 30 parches', price: 9900 },
  stress: { name: 'Stress Relief Patch - 30 parches', price: 9900 },
  'combo-mente': { name: 'Combo Mente & Energia (Focus + NAD)', price: 17900 },
  'combo-metabolismo': { name: 'Combo Metabolismo & Energia (GLP-1 + NAD)', price: 17900 },
  'combo-mood': { name: 'Combo Mood & Calma (Dopamine + Stress)', price: 17900 },
  'combo-foco-calma': { name: 'Combo Foco & Calma (Focus + Stress)', price: 17900 },
  'combo-trio': { name: 'Combo Trio Bienestar (Focus + GLP-1 + Stress)', price: 26900 },
  'combo-full': { name: 'Combo Full House (5 paquetes)', price: 42900 }
};

export const SHIPPING_COST = 3000;

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
