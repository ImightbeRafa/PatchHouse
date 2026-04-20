import { sendOrderEmail } from '../utils/email.js';
import { sendOrderToBetsyWithRetry } from '../utils/betsy.js';
import { sendMetaEvent, generateEventId } from '../utils/meta.js';

const PRODUCTS = {
  'focus': { name: 'Focus Patch – 30 parches', price: 9900 },
  'nad': { name: 'NAD Patch – 30 parches', price: 9900 },
  'glp1': { name: 'GLP-1 Patch – 30 parches', price: 9900 },
  'dopamine': { name: 'Dopamine Patch – 30 parches', price: 9900 },
  'stress': { name: 'Stress Relief Patch – 30 parches', price: 9900 },
  'combo-mente': { name: 'Combo Mente & Energía (Focus + NAD)', price: 17900 },
  'combo-metabolismo': { name: 'Combo Metabolismo & Energía (GLP-1 + NAD)', price: 17900 },
  'combo-mood': { name: 'Combo Mood & Calma (Dopamine + Stress)', price: 17900 },
  'combo-full': { name: 'Combo Full House (5 paquetes)', price: 42900 }
};

const SHIPPING_COST = 2600;

// ── Sold-out configuration (keep in sync with src/js/main.js) ──
const SOLD_OUT = (process.env.VITE_SOLD_OUT || process.env.SOLD_OUT || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const COMBO_CONTENTS = {
  'combo-mente': ['focus', 'nad'],
  'combo-metabolismo': ['glp1', 'nad'],
  'combo-mood': ['dopamine', 'stress'],
  'combo-full': ['focus', 'nad', 'glp1', 'dopamine', 'stress']
};

function isSoldOut(productKey) {
  if (SOLD_OUT.includes(productKey)) return true;
  const contents = COMBO_CONTENTS[productKey];
  if (contents && contents.some(k => SOLD_OUT.includes(k))) return true;
  return false;
}

function parseItems(body) {
  let items = [];
  if (body.items) {
    try {
      items = typeof body.items === 'string' ? JSON.parse(body.items) : body.items;
    } catch (e) {
      return null;
    }
  } else if (body.producto) {
    items = [{ key: body.producto, qty: parseInt(body.cantidad) || 1 }];
  }
  return items.filter(i => PRODUCTS[i.key] && i.qty > 0 && !isSoldOut(i.key));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { return res.status(405).json({ error: 'Method not allowed' }); }

  try {
    const { nombre, telefono, email, provincia, canton, distrito, direccion, comentarios } = req.body;

    if (!nombre || !telefono || !email || !provincia || !canton || !distrito || !direccion) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const items = parseItems(req.body);
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No valid products in order' });
    }

    let subtotal = 0;
    const itemDetails = items.map(i => {
      const p = PRODUCTS[i.key];
      const lineTotal = p.price * i.qty;
      subtotal += lineTotal;
      return { key: i.key, name: p.name, price: p.price, qty: i.qty, lineTotal };
    });

    const total = subtotal + SHIPPING_COST;
    const orderId = Math.floor(100000 + Math.random() * 900000).toString();

    const order = {
      orderId, nombre, telefono, email,
      provincia, canton, distrito, direccion,
      items: itemDetails,
      subtotal, shippingCost: SHIPPING_COST, total,
      comentarios,
      paymentMethod: 'SINPE',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString()
    };
    const appUrl = (process.env.APP_URL || 'https://patchhouse.shopping').replace(/\/+$/, '');
    const metaEventId = generateEventId('lead', orderId);

    let emailSent = false;
    try {
      await sendOrderEmail(order);
      emailSent = true;
      console.log('✅ SINPE order email sent:', orderId);
    } catch (emailError) {
      console.error('❌ Failed to send SINPE email:', emailError.message);
    }

    try {
      await sendOrderToBetsyWithRetry(order);
      console.log('✅ SINPE order synced to Betsy CRM');
    } catch (betsyError) {
      console.error('❌ Failed to sync SINPE order to Betsy CRM:', betsyError.message);
    }

    await sendMetaEvent('Lead', metaEventId, order, req, {
      value: total,
      currency: 'CRC',
      content_ids: itemDetails.map(i => i.key),
      content_type: 'product',
      num_items: itemDetails.reduce((sum, i) => sum + i.qty, 0)
    }, `${appUrl}/#pedido`).catch(() => {});

    return res.json({
      success: true,
      orderId,
      metaEventId,
      emailSent,
      message: emailSent
        ? 'Pedido recibido. Revisá tu correo para las instrucciones de pago SINPE.'
        : 'Pedido recibido. No se pudo enviar el correo — contactanos por WhatsApp para instrucciones de pago.'
    });

  } catch (error) {
    console.error('❌ Send SINPE email error:', error);
    return res.status(500).json({ error: 'Failed to send email', message: error.message });
  }
}
