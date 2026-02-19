/**
 * Betsy CRM Integration Utility – PatchHouse (multi-item)
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

function getOrderItems(orderData) {
  if (orderData.items && Array.isArray(orderData.items)) {
    return orderData.items;
  }
  const key = orderData.producto || 'focus';
  const product = PRODUCTS[key] || PRODUCTS['focus'];
  return [{ key, name: product.name, price: product.price, qty: parseInt(orderData.cantidad) || 1, lineTotal: product.price * (parseInt(orderData.cantidad) || 1) }];
}

export async function sendOrderToBetsy(orderData) {
  const apiKey = process.env.BETSY_API_KEY;
  const apiUrl = process.env.BETSY_API_URL;

  if (!apiKey || !apiUrl) {
    console.warn('⚠️ [Betsy] API credentials not configured, skipping CRM sync');
    return { success: false, error: 'Not configured' };
  }

  try {
    console.log('📤 [Betsy] Sending order to CRM:', orderData.orderId);

    const paymentMethod = orderData.paymentMethod || 'Tilopay';
    const paymentStatus = orderData.paymentStatus === 'completed' ? 'PAGADO' : 'PENDIENTE';
    const transactionId = orderData.paymentId || orderData.transactionId || 'PENDING';

    let paymentComment = '';
    if (paymentMethod === 'SINPE') {
      paymentComment = `Pago: SINPE Móvil - Estado: Pendiente de confirmación`;
    } else if (paymentMethod === 'Tilopay' || paymentMethod === 'Tarjeta') {
      paymentComment = paymentStatus === 'PAGADO'
        ? `Pago: Tarjeta (Tilopay) - Estado: PAGADO - ID Transacción: ${transactionId}`
        : `Pago: Tarjeta (Tilopay) - Estado: Pendiente`;
    } else {
      paymentComment = `Pago: ${paymentMethod} - Estado: ${paymentStatus}`;
    }

    const items = getOrderItems(orderData);
    const productLines = items.map(i => `${i.name} x${i.qty} — ₡${(i.price * i.qty).toLocaleString('es-CR')}`);
    const productName = items.length === 1
      ? items[0].name
      : `Pedido múltiple (${items.length} productos)`;

    const userComments = orderData.comentarios || '';
    const parts = [paymentComment, 'Productos:', ...productLines];
    if (userComments) parts.push(`Comentarios del cliente: ${userComments}`);
    const fullComments = parts.join('\n');

    const totalQty = items.reduce((sum, i) => sum + i.qty, 0);

    const betsyOrder = {
      orderId: orderData.orderId,
      customer: {
        name: orderData.nombre,
        phone: orderData.telefono,
        email: orderData.email,
      },
      product: {
        name: productName,
        quantity: totalQty,
        unitPrice: `₡${orderData.subtotal ? orderData.subtotal.toLocaleString('es-CR') : '0'}`,
      },
      shipping: {
        cost: `₡2.600`,
        courier: 'Correos de Costa Rica',
        address: {
          province: orderData.provincia,
          canton: orderData.canton,
          district: orderData.distrito,
          fullAddress: orderData.direccion,
        },
      },
      total: `₡${orderData.total.toLocaleString('es-CR')}`,
      payment: {
        method: paymentMethod,
        transactionId: transactionId,
        status: 'PENDIENTE',
        date: new Date().toLocaleString('es-CR', {
          timeZone: 'America/Costa_Rica',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }),
      },
      source: 'PatchHouse Website',
      salesChannel: 'Website',
      seller: 'Website',
      metadata: {
        campaign: orderData.campaign || 'organic',
        referrer: orderData.referrer || 'direct',
        comments: fullComments,
        createdAt: orderData.createdAt || new Date().toISOString(),
      },
    };

    console.log('📦 [Betsy] Order payload:', JSON.stringify(betsyOrder, null, 2));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(betsyOrder),
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('❌ [Betsy] Fetch failed:', fetchError.message);
      throw fetchError;
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [Betsy] CRM sync failed:', response.status, errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}`, status: response.status };
    }

    const result = await response.json();
    console.log('✅ [Betsy] Order synced to CRM:', result.crmOrderId || result.id);
    return { success: true, crmOrderId: result.crmOrderId || result.id, data: result };

  } catch (error) {
    console.error('❌ [Betsy] CRM sync error:', error.message);
    if (error.name === 'AbortError') {
      console.error('❌ [Betsy] Request timed out after 10 seconds');
    }
    return { success: false, error: error.message, errorType: error.name };
  }
}

export async function sendOrderToBetsyWithRetry(orderData, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 [Betsy] Attempt ${attempt}/${maxRetries} for order ${orderData.orderId}`);
    const result = await sendOrderToBetsy(orderData);

    if (result.success) return result;

    if (attempt < maxRetries && isRetryableError(result)) {
      const waitTime = 1000 * attempt;
      console.log(`⏳ [Betsy] Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }

    console.error(`❌ [Betsy] Failed after ${attempt} attempts:`, result.error);
    return result;
  }
}

function isRetryableError(result) {
  if (result.error === 'Not configured') return false;
  if (result.status >= 500) return true;
  if (result.error && (
    result.error.includes('timeout') ||
    result.error.includes('network') ||
    result.error.includes('ECONNREFUSED') ||
    result.error.includes('ETIMEDOUT')
  )) return true;
  return false;
}
