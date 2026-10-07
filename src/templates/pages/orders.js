import { SITE } from '../../../shared/catalog.js';
import { layout, icons } from '../layout.js';

const WA = `https://wa.me/${SITE.whatsapp}`;

/** /pedido/ – SINPE instructions or card-order summary, rendered by src/js/confirm.js from localStorage. */
export function confirmPage() {
  const main = `
<div class="container narrow status-page">
  <div data-state="loading" class="status-card"><div class="spinner dark" style="width:36px;height:36px;margin:0 auto"></div></div>

  <div data-state="none" class="status-card" hidden>
    <h1>No encontramos tu pedido en este dispositivo</h1>
    <p>Si ya hiciste un pedido, revisá tu correo: ahí te enviamos la confirmación con todos los datos.</p>
    <div class="status-actions"><a class="btn btn-cta" href="/">Volver a la tienda</a><a class="btn btn-wa" href="${WA}" target="_blank" rel="noopener">Escribinos por WhatsApp</a></div>
  </div>

  <div data-state="sinpe" hidden>
    <div class="status-hero"><span class="status-icon warn">${icons.clock}</span>
      <h1>¡Casi listo, <span data-name>cliente</span>!</h1>
      <p>Tu pedido <b data-order-id></b> quedó registrado. Falta un paso: <b>pagar por SINPE Móvil</b>.</p></div>

    <div class="sinpe-card">
      <ol class="sinpe-steps">
        <li><i>1</i><div>Abrí la app de tu banco y entrá a <b>SINPE Móvil</b>.</div></li>
        <li><i>2</i><div>Enviá exactamente <b class="big" data-amount></b> a este número:
          <div class="copy-row"><div><span class="cr-label">Número</span><b data-phone></b><span class="cr-sub" data-holder></span></div><button class="btn btn-outline btn-sm" type="button" data-copy="phone">Copiar</button></div></div></li>
        <li><i>3</i><div>En el <b>detalle</b> escribí tu número de pedido:
          <div class="copy-row"><div><span class="cr-label">Detalle</span><b data-reference></b></div><button class="btn btn-outline btn-sm" type="button" data-copy="reference">Copiar</button></div></div></li>
        <li><i>4</i><div>Mandanos el comprobante por WhatsApp y preparamos tu envío apenas lo verifiquemos.</div></li>
      </ol>
      <a class="btn btn-wa btn-lg btn-block" data-wa href="${WA}" target="_blank" rel="noopener">${icons.whatsapp} Enviar comprobante por WhatsApp</a>
      <p class="fineprint">También te enviamos estas instrucciones por correo. Tu pedido no se despacha hasta confirmar el pago.</p>
    </div>
  </div>

  <div data-state="card" hidden>
    <div class="status-hero"><span class="status-icon ok">${icons.check}</span>
      <h1>¡Gracias por tu compra!</h1>
      <p>Tu pedido <b data-order-id></b> está en proceso. Te enviamos la confirmación por correo y te contactamos para coordinar la entrega.</p></div>
  </div>

  <section class="order-recap" data-recap hidden>
    <h2>Resumen del pedido</h2>
    <div data-lines></div>
    <dl class="totals"><div class="grand"><dt>Total</dt><dd data-total></dd></div></dl>
    <div class="status-actions"><a class="btn btn-outline" href="/">Seguir comprando</a></div>
  </section>
</div>`;
  return layout({
    title: 'Tu pedido | PatchHouse.CR',
    description: 'Estado de tu pedido en PatchHouse.',
    path: '/pedido/',
    main,
    page: 'confirm',
    css: ['/src/styles/checkout.css'],
    noindex: true
  });
}

/** /success.html – Tilopay redirect target (the path is fixed by the Tilopay integration). */
export function successPage() {
  const main = `
<div class="container narrow status-page">
  <div data-state="loading" class="status-card"><div class="spinner dark" style="width:36px;height:36px;margin:0 auto 16px"></div><h1>Verificando tu pago…</h1><p>Estamos confirmando tu transacción. Por favor no cerrés esta página.</p></div>

  <div data-state="success" hidden>
    <div class="status-hero"><span class="status-icon ok">${icons.check}</span>
      <h1 data-title>¡Pago recibido!</h1>
      <p data-text>Tu pago fue aprobado y tu pedido está confirmado.</p></div>
    <div class="status-card"><span class="cr-label">Número de orden</span><b class="big" data-order-id>—</b>
      <p data-next>Recibirás un correo con los detalles de tu pedido y te contactaremos para coordinar la entrega.</p>
      <div class="status-actions"><a class="btn btn-cta" href="/">Volver a la tienda</a><a class="btn btn-wa" href="${WA}" target="_blank" rel="noopener">WhatsApp</a></div></div>
  </div>

  <div data-state="error" class="status-card" hidden>
    <span class="status-icon bad">${icons.close}</span>
    <h1 data-error-title>No pudimos verificar tu pago</h1>
    <p data-error-text>Si creés que es un error, escribinos por WhatsApp con tu número de orden.</p>
    <div class="status-actions"><a class="btn btn-cta" href="/checkout/">Intentar de nuevo</a><a class="btn btn-wa" href="${WA}" target="_blank" rel="noopener">Escribinos por WhatsApp</a></div>
  </div>
</div>`;
  return layout({
    title: 'Verificando pago | PatchHouse.CR',
    description: 'Confirmación de pago de tu pedido PatchHouse.',
    path: '/success.html',
    main,
    page: 'success',
    css: ['/src/styles/checkout.css'],
    noindex: true,
    pixelNow: true
  });
}

/** /error.html – declined or cancelled card payments. */
export function errorPage() {
  const main = `
<div class="container narrow status-page">
  <div class="status-card">
    <span class="status-icon bad">${icons.close}</span>
    <h1>No se pudo procesar el pago</h1>
    <p>No te preocupes: <b>no se realizó ningún cargo</b>. Puede deberse a fondos insuficientes, datos de la tarjeta incorrectos o un rechazo del banco.</p>
    <p class="fineprint" data-detail hidden></p>
    <div class="status-actions"><a class="btn btn-cta" href="/checkout/">Intentar de nuevo</a><a class="btn btn-wa" href="${WA}" target="_blank" rel="noopener">Ayuda por WhatsApp</a></div>
  </div>
</div>`;
  return layout({
    title: 'Error en el pago | PatchHouse.CR',
    description: 'No se pudo procesar el pago de tu pedido.',
    path: '/error.html',
    main,
    page: 'error',
    css: ['/src/styles/checkout.css'],
    noindex: true
  });
}
