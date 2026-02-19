/**
 * PatchHouse – Tilopay Create Payment (multi-item cart)
 */

const PRODUCTS = {
  'focus': { name: 'Focus Patch – 30 parches', price: 9900 },
  'nad': { name: 'NAD Patch – 30 parches', price: 9900 },
  'dopamine': { name: 'Dopamine Patch – 30 parches', price: 9900 },
  'stress': { name: 'Stress Relief Patch – 30 parches', price: 9900 },
  'combo-mente': { name: 'Combo Mente & Energía (Focus + NAD)', price: 17900 },
  'combo-mood': { name: 'Combo Mood & Calma (Dopamine + Stress)', price: 17900 },
  'combo-full': { name: 'Combo Full House (4 paquetes)', price: 34900 }
};

const SHIPPING_COST = 2600;

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
  return items.filter(i => PRODUCTS[i.key] && i.qty > 0);
}

async function authenticateTilopay() {
  const baseUrl = process.env.TILOPAY_BASE_URL || 'https://app.tilopay.com/api/v1';
  const apiUser = process.env.TILOPAY_USER;
  const apiPassword = process.env.TILOPAY_PASSWORD;

  if (!apiUser || !apiPassword) {
    throw new Error('Tilopay credentials not configured in environment variables');
  }

  const loginResponse = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiuser: apiUser, password: apiPassword })
  });

  if (!loginResponse.ok) {
    const errorText = await loginResponse.text();
    throw new Error(`Failed to authenticate with Tilopay: ${loginResponse.status} ${errorText}`);
  }

  const loginData = await loginResponse.json();
  if (!loginData.access_token) {
    throw new Error('No access token in Tilopay response');
  }

  return loginData.access_token;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { return res.status(405).json({ error: 'Method not allowed' }); }

  console.log('🔵 [Tilopay] Creating payment link...');

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

    console.log('🔑 [Tilopay] Authenticating...');
    const accessToken = await authenticateTilopay();
    console.log('✅ [Tilopay] Authentication successful');

    const baseUrl = process.env.TILOPAY_BASE_URL || 'https://app.tilopay.com/api/v1';
    const apiKey = process.env.TILOPAY_API_KEY;
    let appUrl = process.env.APP_URL || 'https://patchhouse.shopping';

    if (appUrl && !appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
      appUrl = `https://${appUrl}`;
    }
    appUrl = appUrl.replace(/\/+$/, '');

    if (!apiKey) {
      throw new Error('TILOPAY_API_KEY not configured in environment variables');
    }

    const nameParts = nombre.split(' ');
    const firstName = nameParts[0] || nombre;
    const lastName = nameParts.slice(1).join(' ') || nombre;

    const orderData = {
      orderId, nombre, telefono, email,
      provincia, canton, distrito, direccion,
      items: itemDetails,
      subtotal, shippingCost: SHIPPING_COST, total,
      comentarios, createdAt: new Date().toISOString()
    };
    const encodedOrderData = Buffer.from(JSON.stringify(orderData)).toString('base64');

    const paymentPayload = {
      key: apiKey,
      amount: Math.round(total),
      currency: 'CRC',
      redirect: `${appUrl}/success.html`,
      hashVersion: 'V2',
      billToFirstName: firstName,
      billToLastName: lastName,
      billToAddress: direccion,
      billToAddress2: `${distrito}, ${canton}`,
      billToCity: canton,
      billToState: 'CR-' + ({
        'San José': 'SJ', 'Alajuela': 'A', 'Cartago': 'C',
        'Heredia': 'H', 'Guanacaste': 'G', 'Puntarenas': 'P', 'Limón': 'L'
      }[provincia] || 'SJ'),
      billToZipPostCode: '10101',
      billToCountry: 'CR',
      billToTelephone: telefono,
      billToEmail: email,
      orderNumber: orderId,
      capture: '1',
      subscription: '0',
      platform: 'PatchHouse',
      returnData: encodedOrderData
    };

    console.log('📤 [Tilopay] Sending payment request...');

    const captureResponse = await fetch(`${baseUrl}/processPayment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(paymentPayload)
    });

    if (!captureResponse.ok) {
      const errorText = await captureResponse.text();
      console.error('❌ [Tilopay] Payment error:', errorText);
      throw new Error(`Failed to create payment link: ${captureResponse.status} - ${errorText}`);
    }

    const paymentData = await captureResponse.json();
    const paymentUrl = paymentData.urlPaymentForm || paymentData.url || paymentData.payment_url;

    if (!paymentUrl) {
      console.error('❌ [Tilopay] No payment URL in response:', paymentData);
      throw new Error('No payment URL received from Tilopay');
    }

    return res.json({
      success: true,
      orderId,
      paymentUrl: paymentUrl,
      transactionId: paymentData.id || paymentData.transaction_id
    });

  } catch (error) {
    console.error('❌ [Tilopay] Create payment error:', error);
    return res.status(500).json({
      error: 'Failed to create payment',
      message: 'Hubo un error al procesar tu pago. Por favor intentá de nuevo.'
    });
  }
}
