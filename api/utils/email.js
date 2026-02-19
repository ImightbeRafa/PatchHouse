/**
 * Resend Email Integration – PatchHouse (multi-item)
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

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getOrderItems(order) {
  if (order.items && Array.isArray(order.items)) {
    return order.items;
  }
  const key = order.producto || 'focus';
  const product = PRODUCTS[key] || PRODUCTS['focus'];
  return [{ key, name: product.name, price: product.price, qty: parseInt(order.cantidad) || 1, lineTotal: product.price * (parseInt(order.cantidad) || 1) }];
}

function buildItemsHtml(items) {
  return items.map(i =>
    `<tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">${esc(i.name)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; text-align: center;">${i.qty}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">₡${(i.price * i.qty).toLocaleString('es-CR')}</td>
    </tr>`
  ).join('');
}

async function sendCustomerEmail(order) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const items = getOrderItems(order);

  const customerEmailHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f9fafb; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center; }
      .header h1 { color: white; margin: 0; font-size: 26px; }
      .header p { color: rgba(255,255,255,0.9); margin: 5px 0 0; }
      .content { padding: 30px; }
      h2 { color: #059669; margin-top: 0; }
      .order-box { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; }
      .label { font-weight: bold; color: #059669; display: inline-block; min-width: 140px; }
      .footer { margin-top: 30px; padding: 20px 30px; background: #f9fafb; text-align: center; font-size: 14px; color: #6b7280; }
      .highlight { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; }
      table { width: 100%; border-collapse: collapse; }
      th { text-align: left; padding: 8px 0; border-bottom: 2px solid #059669; color: #059669; font-size: 13px; }
      th:last-child { text-align: right; }
      th:nth-child(2) { text-align: center; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>PatchHouse.CR</h1>
        <p>Parches Transdérmicos Naturales</p>
      </div>
      <div class="content">
        <h2>Confirmación de Pedido</h2>
        <p>Hola <strong>${esc(order.nombre)}</strong>,</p>
        <p>Gracias por tu pedido. Aquí están los detalles:</p>

        <div class="order-box">
          <p><span class="label">Número de Orden:</span> ${esc(order.orderId)}</p>
          <table>
            <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th></tr></thead>
            <tbody>${buildItemsHtml(items)}</tbody>
          </table>
          <br>
          ${order.subtotal ? `<p><span class="label">Subtotal:</span> ₡${order.subtotal.toLocaleString('es-CR')}</p>` : ''}
          <p><span class="label">Envío:</span> ₡2.600</p>
          <p><span class="label">Total:</span> <strong>₡${order.total.toLocaleString('es-CR')}</strong></p>
        </div>

        ${order.paymentMethod === 'SINPE' ? `
        <div class="highlight">
          <h3>Instrucciones de Pago SINPE</h3>
          <p><strong>Número SINPE:</strong> 6201-9914</p>
          <p><strong>Nombre:</strong> Rafael Garcia</p>
          <p><strong>Monto:</strong> ₡${order.total.toLocaleString('es-CR')}</p>
          <p><strong>Pasos a seguir:</strong></p>
          <ol>
            <li>Abrí la aplicación SINPE Móvil de tu banco</li>
            <li>Realizá la transferencia al número <strong>6201-9914</strong></li>
            <li><strong>Importante:</strong> En el concepto escribí: <code>${esc(order.orderId)}</code></li>
            <li>Guardá el comprobante de pago</li>
            <li>Enviá el comprobante por WhatsApp al <strong>7052-6254</strong></li>
          </ol>
        </div>
        ` : `
        <p>Tu pago con tarjeta ha sido procesado exitosamente.</p>
        `}

        <div class="order-box">
          <p><strong>Dirección de Envío:</strong></p>
          <p>${esc(order.direccion)}</p>
          <p>${esc(order.distrito)}, ${esc(order.canton)}, ${esc(order.provincia)}</p>
        </div>

        <p style="text-align: center;">Te contactaremos pronto para coordinar la entrega.</p>
      </div>
      <div class="footer">
        <p>¿Tenés preguntas?</p>
        <p>WhatsApp: <strong>7052-6254</strong></p>
        <p>Instagram: <strong>@patchhouse.cr</strong></p>
        <br>
        <p>© 2026 PatchHouse.CR – Todos los derechos reservados.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`
    },
    body: JSON.stringify({
      from: 'PatchHouse <orders@patchhouse.shopping>',
      to: order.email,
      subject: `Confirmación de Pedido ${order.orderId} – PatchHouse`,
      html: customerEmailHtml
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('❌ [Resend] Customer email failed:', response.status, errorBody);
    throw new Error(`Failed to send customer email: ${response.status} - ${errorBody}`);
  }

  return await response.json();
}

async function sendAdminEmail(order) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const notificationEmail = process.env.ORDER_NOTIFICATION_EMAIL;
  const items = getOrderItems(order);

  const itemsSummary = items.map(i => `${esc(i.name)} x${i.qty} — ₡${(i.price * i.qty).toLocaleString('es-CR')}`).join('<br>');

  const adminEmailHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      h2 { color: #059669; border-bottom: 3px solid #10b981; padding-bottom: 10px; }
      h3 { color: #059669; margin-top: 25px; }
      .info-section { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0; }
      .info-item { margin: 8px 0; }
      .label { font-weight: bold; color: #059669; }
      .total { font-size: 20px; font-weight: bold; color: #059669; }
      .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-size: 14px; color: #6b7280; }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Nueva Orden PatchHouse – ${esc(order.orderId)}</h2>

      <div class="info-section">
        <h3>Información del Cliente:</h3>
        <p class="info-item"><span class="label">Nombre:</span> ${esc(order.nombre)}</p>
        <p class="info-item"><span class="label">Teléfono:</span> ${esc(order.telefono)}</p>
        <p class="info-item"><span class="label">Email:</span> ${esc(order.email)}</p>
      </div>

      <div class="info-section">
        <h3>Productos:</h3>
        <p class="info-item">${itemsSummary}</p>
        ${order.subtotal ? `<p class="info-item"><span class="label">Subtotal:</span> ₡${order.subtotal.toLocaleString('es-CR')}</p>` : ''}
        <p class="info-item"><span class="label">Envío:</span> ₡2.600</p>
        <p class="info-item"><span class="label total">Total:</span> <span class="total">₡${order.total.toLocaleString('es-CR')}</span></p>
      </div>

      <div class="info-section">
        <h3>Dirección de Envío:</h3>
        <p class="info-item"><span class="label">Provincia:</span> ${esc(order.provincia)}</p>
        <p class="info-item"><span class="label">Cantón:</span> ${esc(order.canton)}</p>
        <p class="info-item"><span class="label">Distrito:</span> ${esc(order.distrito)}</p>
        <p class="info-item"><span class="label">Dirección Completa:</span> ${esc(order.direccion)}</p>
      </div>

      ${order.comentarios ? `
      <div class="info-section">
        <h3>Comentarios del Cliente:</h3>
        <p>${esc(order.comentarios)}</p>
      </div>
      ` : ''}

      <div class="info-section">
        <h3>Información de Pago:</h3>
        <p class="info-item"><span class="label">Método:</span> ${order.paymentMethod || 'Tilopay'}</p>
        <p class="info-item"><span class="label">ID de Transacción:</span> ${order.paymentId || 'Pendiente'}</p>
        <p class="info-item"><span class="label">Estado:</span> ${order.paymentStatus === 'completed' ? 'PAGADO ✅' : 'PENDIENTE'}</p>
        <p class="info-item"><span class="label">Fecha:</span> ${new Date(order.paidAt || order.createdAt).toLocaleString('es-CR')}</p>
      </div>

      <div class="footer">
        <p>Por favor, procese esta orden y coordine el envío lo antes posible.</p>
        <p>Este es un correo automático generado por PatchHouse.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`
    },
    body: JSON.stringify({
      from: 'PatchHouse <orders@patchhouse.shopping>',
      to: notificationEmail,
      subject: `Nueva Orden: ${order.orderId} – ${order.nombre}`,
      html: adminEmailHtml
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('❌ [Resend] Admin email failed:', response.status, errorBody);
    throw new Error(`Failed to send admin email: ${response.status} - ${errorBody}`);
  }

  return await response.json();
}

export async function sendOrderEmail(order) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const notificationEmail = process.env.ORDER_NOTIFICATION_EMAIL;

  console.log('📧 [Email] === RESEND DIAGNOSTICS ===');
  console.log('📧 [Email] RESEND_API_KEY set:', !!resendApiKey);
  console.log('📧 [Email] ORDER_NOTIFICATION_EMAIL:', notificationEmail || 'NOT SET');
  console.log('📧 [Email] Customer email:', order.email || 'NOT PROVIDED');
  console.log('📧 [Email] Order ID:', order.orderId);

  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }

  if (!notificationEmail) {
    throw new Error('ORDER_NOTIFICATION_EMAIL not configured');
  }

  let customerEmailSent = false;
  let adminEmailSent = false;

  if (order.email) {
    try {
      const customerResult = await sendCustomerEmail(order);
      customerEmailSent = true;
      console.log('✅ [Email] Customer email sent to:', order.email, 'Result:', JSON.stringify(customerResult));
    } catch (error) {
      console.error('❌ [Email] Customer email FAILED:', error.message);
    }
  }

  try {
    const adminResult = await sendAdminEmail(order);
    adminEmailSent = true;
    console.log('✅ [Email] Admin email sent to:', notificationEmail, 'Result:', JSON.stringify(adminResult));
  } catch (error) {
    console.error('❌ [Email] Admin email FAILED:', error.message);
  }

  console.log('📧 [Email] Summary — Customer:', customerEmailSent ? 'SENT' : 'FAILED', '| Admin:', adminEmailSent ? 'SENT' : 'FAILED');

  if (!customerEmailSent && !adminEmailSent) {
    throw new Error('Both emails failed to send');
  }

  return { success: true, customerEmailSent, adminEmailSent };
}
