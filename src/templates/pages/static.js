import { SITE, SHIPPING_COST, formatCRC } from '../../../shared/catalog.js';
import { layout, esc } from '../layout.js';

const UPDATED = 'Octubre 2026';
const WA = `<a href="https://wa.me/${SITE.whatsapp}">WhatsApp ${SITE.whatsappDisplay}</a>`;

const prose = (title, intro, body) => `<div class="container"><article class="prose">
  <h1>${esc(title)}</h1>
  <p class="updated">Última actualización: ${UPDATED}</p>
  ${intro ? `<p>${intro}</p>` : ''}
  ${body}
</article></div>`;

export function shippingPage() {
  const body = `
<h2>1. Cobertura y costo de envío</h2>
<ul>
  <li>Enviamos a <b>todo Costa Rica</b> por Correos de Costa Rica o mensajería privada.</li>
  <li>El envío tiene un costo <b>fijo de ${formatCRC(SHIPPING_COST)} por pedido</b>, sin importar la cantidad de productos ni la provincia.</li>
  <li>El costo de envío se muestra en el carrito y se suma al total antes de pagar. No hay cargos ocultos.</li>
</ul>

<h2>2. Tiempos de entrega</h2>
<ul>
  <li>El tiempo estimado de entrega es de <b>${SITE.deliveryDays}</b>.</li>
  <li>El plazo empieza a contar cuando tu pago está confirmado: al aprobarse el pago con tarjeta, o cuando verificamos tu comprobante de SINPE Móvil.</li>
  <li>Los tiempos son estimados y pueden variar en zonas alejadas o por demoras del servicio de entrega.</li>
</ul>

<h2>3. Retiro en persona</h2>
<p>También podés retirar tu pedido en ${SITE.pickup}. Escribinos por ${WA} después de hacer tu pedido para coordinar el lugar y la hora.</p>

<h2>4. Cómo pagar</h2>
<ul>
  <li><b>SINPE Móvil.</b> Al confirmar tu pedido te mostramos el número, el monto exacto y tu número de pedido para escribir en el detalle de la transferencia. Enviá el comprobante por WhatsApp. <b>Preparamos tu envío cuando verificamos el depósito.</b></li>
  <li><b>Tarjeta de crédito o débito.</b> El pago se procesa en la pasarela segura de Tilopay. PatchHouse no ve ni almacena los datos de tu tarjeta.</li>
</ul>

<h2>5. Dirección de entrega</h2>
<p>Revisá bien tus datos y tus señas antes de confirmar. Si la dirección es incorrecta o incompleta y el pedido no se puede entregar, vamos a contactarte para coordinar una nueva entrega; el costo de un reenvío por error en la dirección corre por cuenta del cliente.</p>

<h2>6. Pedidos dañados, incompletos o incorrectos</h2>
<ul>
  <li>Si tu pedido llega dañado, incompleto o diferente a lo que compraste, escribinos por ${WA} <b>dentro de las 48 horas siguientes a la entrega</b>, con tu número de pedido y fotos del producto y del empaque.</li>
  <li>Revisamos tu caso y, según corresponda, <b>reemplazamos el producto o te devolvemos el dinero</b>. El costo del reenvío lo asumimos nosotros.</li>
</ul>

<h2>7. Devoluciones</h2>
<ul>
  <li>Por tratarse de suplementos de uso personal, <b>no aceptamos devoluciones de productos abiertos o usados</b>, salvo por los casos del punto 6.</li>
  <li>Si cambiás de opinión antes de que tu pedido sea despachado, escribinos por ${WA} y lo cancelamos con reembolso completo.</li>
  <li>Los reembolsos se hacen por el mismo medio de pago: a tu tarjeta (según los plazos de tu banco) o por SINPE Móvil al número desde el que pagaste.</li>
</ul>

<h2>8. Contacto</h2>
<p>¿Dudas sobre tu envío? Escribinos por ${WA}. Incluí tu número de pedido (empieza con ORD-).</p>`;
  return layout({
    title: 'Envíos y devoluciones | PatchHouse.CR',
    description: 'Costo de envío, tiempos de entrega, retiro, formas de pago, devoluciones y reembolsos en PatchHouse Costa Rica.',
    path: '/envios-y-devoluciones/', main: prose('Envíos y devoluciones', 'Todo lo que necesitás saber sobre cómo recibís tu pedido y qué hacemos si algo sale mal.', body), page: 'static'
  });
}

export function termsPage() {
  const body = `
<h2>1. Quiénes somos</h2>
<p>PatchHouse.CR es una tienda en línea que vende parches transdérmicos de bienestar en Costa Rica a través de <b>patchhouse.shopping</b>. Al usar este sitio y hacer un pedido aceptás estos términos.</p>

<h2>2. Naturaleza de los productos</h2>
<ul>
  <li>Nuestros parches son <b>suplementos de bienestar</b>. No son medicamentos y no sustituyen el consejo, diagnóstico ni tratamiento de un profesional de la salud.</li>
  <li>Las descripciones de los productos explican su fórmula y su uso previsto. Los resultados pueden variar de una persona a otra.</li>
  <li>Consultá con tu médico antes de usarlos si tenés una condición médica, tomás medicamentos, estás embarazada o en lactancia. No los uses si sos alérgico a alguno de sus ingredientes y suspendé el uso si notás irritación.</li>
  <li>El Energy Patch contiene cafeína. Mantené todos los productos fuera del alcance de los niños.</li>
</ul>

<h2>3. Precios</h2>
<ul>
  <li>Los precios se muestran en <b>colones costarricenses (₡)</b> y son por paquete de 30 parches, salvo que se indique otra cosa.</li>
  <li>Los combos tienen un precio especial que se muestra en cada producto.</li>
  <li>El envío tiene un costo fijo de ${formatCRC(SHIPPING_COST)} por pedido y se suma al total antes de pagar.</li>
  <li>Podemos modificar precios y promociones en cualquier momento. El precio aplicable es el que ves al confirmar tu pedido.</li>
</ul>

<h2>4. Pedidos y confirmación</h2>
<ul>
  <li>Al finalizar la compra recibís un número de pedido (ORD-…) y un correo con el detalle.</li>
  <li>Un pedido queda <b>confirmado cuando el pago es aprobado</b> (tarjeta) o <b>verificado</b> (SINPE Móvil). Hasta ese momento no lo preparamos ni lo despachamos.</li>
  <li>Sos responsable de que tus datos de contacto y de entrega sean correctos.</li>
</ul>

<h2>5. Formas de pago</h2>
<ul>
  <li><b>SINPE Móvil:</b> debés transferir el monto exacto indicado y escribir tu número de pedido en el detalle. Enviá el comprobante por WhatsApp para agilizar la verificación.</li>
  <li><b>Tarjeta de crédito o débito:</b> procesada por Tilopay. PatchHouse no almacena los datos de tu tarjeta.</li>
</ul>

<h2>6. Envíos, devoluciones y reembolsos</h2>
<p>Los costos, plazos y condiciones de entrega, devolución y reembolso están en <a href="/envios-y-devoluciones/">Envíos y devoluciones</a> y forman parte de estos términos.</p>

<h2>7. Disponibilidad</h2>
<p>Los productos están sujetos a disponibilidad. Si un producto que pagaste no está disponible, te contactamos para ofrecerte una alternativa o <b>reembolsarte el total</b>.</p>

<h2>8. Propiedad intelectual</h2>
<p>Los textos, imágenes, videos y marca de este sitio pertenecen a PatchHouse o se usan con autorización. No podés reproducirlos sin permiso.</p>

<h2>9. Limitación de responsabilidad</h2>
<p>PatchHouse no es responsable por el uso indebido de los productos ni por usarlos contrariando las indicaciones del empaque o de un profesional de la salud. Esto no limita los derechos que la ley costarricense te reconoce como consumidor.</p>

<h2>10. Ley aplicable</h2>
<p>Estos términos se rigen por las leyes de la República de Costa Rica.</p>

<h2>11. Contacto</h2>
<p>${WA} · Instagram <a href="${SITE.instagram}">@patchhouse.cr</a></p>`;
  return layout({
    title: 'Términos y condiciones | PatchHouse.CR',
    description: 'Términos y condiciones de compra de PatchHouse.CR: productos, precios, pedidos, pagos, envíos y reembolsos.',
    path: '/terminos/', main: prose('Términos y condiciones', '', body), page: 'static'
  });
}

export function privacyPage() {
  const body = `
<h2>1. Qué datos recopilamos</h2>
<ul>
  <li><b>Datos de tu pedido:</b> nombre, teléfono, correo electrónico, dirección de entrega (provincia, cantón, distrito y señas), productos, monto y comentarios que nos dejés.</li>
  <li><b>Datos de navegación:</b> información técnica básica (como tipo de dispositivo y páginas vistas) que recopila el píxel de Meta para medir nuestros anuncios.</li>
  <li><b>No recopilamos</b> los datos de tu tarjeta: los recibe directamente la pasarela de pago.</li>
</ul>

<h2>2. Para qué los usamos</h2>
<ul>
  <li>Procesar tu pago y entregar tu pedido.</li>
  <li>Contactarte sobre tu pedido (correo o WhatsApp).</li>
  <li>Medir y mejorar nuestra publicidad y nuestro sitio.</li>
</ul>

<h2>3. Con quién los compartimos</h2>
<ul>
  <li><b>Tilopay</b>, para procesar los pagos con tarjeta.</li>
  <li><b>Resend</b>, para enviarte el correo de confirmación de tu pedido.</li>
  <li><b>Nuestro sistema de gestión de pedidos</b>, para preparar y despachar tu envío.</li>
  <li><b>Servicios de entrega</b> (Correos de Costa Rica o mensajería privada), que reciben tu nombre, teléfono y dirección.</li>
  <li><b>Meta (Facebook e Instagram)</b>, mediante su píxel y su API de conversiones. Los datos personales se envían cifrados (hash).</li>
</ul>
<p>No vendemos tu información personal.</p>

<h2>4. Almacenamiento en tu dispositivo</h2>
<p>Guardamos en tu navegador tu carrito, tus datos de contacto y entrega (para que no tengas que escribirlos de nuevo) y tu último pedido. Esa información permanece en tu dispositivo hasta que la borrés. El píxel de Meta puede usar cookies para medir anuncios; podés bloquearlas desde la configuración de tu navegador.</p>

<h2>5. Cuánto tiempo los conservamos</h2>
<p>Conservamos los datos de tus pedidos el tiempo necesario para atenderte, cumplir obligaciones legales y resolver reclamos.</p>

<h2>6. Tus derechos</h2>
<p>Podés pedirnos acceder a tus datos personales, rectificarlos o eliminarlos, y retirar tu consentimiento para el uso publicitario. Escribinos por ${WA} y respondemos tu solicitud.</p>

<h2>7. Cambios a esta política</h2>
<p>Si actualizamos esta política, publicamos la nueva versión en esta página con su fecha de actualización.</p>`;
  return layout({
    title: 'Política de privacidad | PatchHouse.CR',
    description: 'Qué datos recopila PatchHouse.CR, para qué los usa, con quién los comparte y cómo ejercer tus derechos.',
    path: '/privacidad/', main: prose('Política de privacidad', 'Explicamos qué datos usamos cuando comprás en PatchHouse y qué control tenés sobre ellos.', body), page: 'static'
  });
}

export function notFoundPage() {
  const main = '<div class="container"><div class="notfound"><h1>404</h1><h2>No encontramos esa página</h2><p>Puede que el enlace haya cambiado. Volvé a la tienda para ver todos los parches.</p><a class="btn btn-cta btn-lg" href="/">Ir a la tienda</a></div></div>';
  return layout({ title: 'Página no encontrada | PatchHouse.CR', description: 'Página no encontrada.', path: '/404.html', main, page: 'static', noindex: true });
}
