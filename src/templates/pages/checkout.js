import { SITE, PROVINCES } from '../../../shared/catalog.js';
import { layout, icons } from '../layout.js';

const field = (id, label, input, hint = '') => `
<div class="field" data-field="${id}">
  <label for="${id}">${label}</label>
  ${input}
  ${hint ? `<span class="hint">${hint}</span>` : ''}
  <span class="error-msg" id="${id}-error" role="alert" hidden></span>
</div>`;

export function checkoutPage() {
  const main = `
<div class="container checkout">
  <div class="checkout-head">
    <a class="back-link" href="/#tienda">‹ Seguir comprando</a>
    <h1>Finalizar compra</h1>
  </div>

  <div class="checkout-empty" data-empty hidden>
    <h2>Tu carrito está vacío</h2>
    <p>Agregá algún parche para continuar con tu pedido.</p>
    <a class="btn btn-cta btn-lg" href="/#tienda">Ver los parches</a>
  </div>

  <div class="checkout-grid" data-checkout hidden>
    <form id="checkout-form" class="checkout-form" novalidate autocomplete="on">
      <div class="form-alert" role="alert" data-form-alert hidden></div>

      <fieldset class="group">
        <legend>1. Datos personales</legend>
        <div class="row two">
          ${field('nombre', 'Nombre completo', '<input id="nombre" name="nombre" type="text" autocomplete="name" placeholder="María Fernández" required aria-describedby="nombre-error">')}
          ${field('telefono', 'Teléfono', '<input id="telefono" name="telefono" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="8888-8888" required aria-describedby="telefono-error">')}
        </div>
        ${field('email', 'Correo electrónico <span class="opt-note" data-email-optional>(opcional)</span>', '<input id="email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="maria@correo.com" aria-describedby="email-error">', 'Te enviamos la confirmación de tu pedido aquí.')}
      </fieldset>

      <fieldset class="group">
        <legend>2. Dirección de envío</legend>
        <div class="row three">
          ${field('provincia', 'Provincia', `<select id="provincia" name="provincia" autocomplete="address-level1" required aria-describedby="provincia-error"><option value="">Seleccioná</option>${PROVINCES.map((p) => `<option value="${p}">${p}</option>`).join('')}</select>`)}
          ${field('canton', 'Cantón', '<input id="canton" name="canton" type="text" autocomplete="address-level2" placeholder="Escazú" required aria-describedby="canton-error">')}
          ${field('distrito', 'Distrito', '<input id="distrito" name="distrito" type="text" autocomplete="address-level3" placeholder="San Rafael" required aria-describedby="distrito-error">')}
        </div>
        ${field('direccion', 'Dirección completa', '<textarea id="direccion" name="direccion" rows="3" autocomplete="street-address" placeholder="200 m norte de la iglesia, casa blanca con portón negro" required aria-describedby="direccion-error"></textarea>', 'Incluí señas para que el mensajero te encuentre.')}
      </fieldset>

      <fieldset class="group">
        <legend>3. Método de pago</legend>
        <div class="pay-options" role="radiogroup" aria-label="Método de pago" data-pay-options>
          <label class="pay-opt on" data-method="sinpe">
            <input type="radio" name="metodo" value="sinpe" checked>
            <span class="radio" aria-hidden="true"></span>
            <span class="po-main"><b>SINPE Móvil</b><span>Transferí desde la app de tu banco</span></span>
            <span class="po-badge">Más usado</span>
          </label>
          <label class="pay-opt" data-method="card">
            <input type="radio" name="metodo" value="card">
            <span class="radio" aria-hidden="true"></span>
            <span class="po-main"><b>Tarjeta de crédito o débito</b><span>Pago seguro en la pasarela de Tilopay</span></span>
          </label>
        </div>
        <div class="pay-help" data-help-sinpe>
          <ol>
            <li>Confirmás tu pedido aquí.</li>
            <li>Te mostramos el número de SINPE Móvil y el monto exacto.</li>
            <li>Nos enviás el comprobante por WhatsApp y preparamos tu envío.</li>
          </ol>
        </div>
        <div class="pay-help" data-help-card hidden><p>Te llevamos a la pasarela segura de Tilopay para completar el pago. Aceptamos tarjetas de crédito y débito.</p></div>
        ${field('comentarios', 'Comentarios (opcional)', '<textarea id="comentarios" name="comentarios" rows="2" placeholder="Instrucciones especiales de entrega…"></textarea>')}
      </fieldset>

      <div class="hp" aria-hidden="true"><label>No llenar este campo<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>

      <button class="btn btn-cta btn-lg btn-block submit-desktop" type="submit" data-submit><span data-submit-label>Confirmar pedido</span></button>
      <p class="secure-note">${icons.lock} Tus datos solo se usan para procesar y entregar tu pedido.</p>
    </form>

    <aside class="summary" aria-labelledby="summary-title">
      <details class="summary-toggle" data-summary-toggle open>
        <summary><span id="summary-title">Tu pedido</span><span class="sum-total" data-summary-mini></span></summary>
        <div class="summary-body">
          <div data-lines></div>
          <div data-ship-progress></div>
          <dl class="totals">
            <div><dt>Subtotal</dt><dd data-subtotal></dd></div>
            <div class="save-line" data-savings-row hidden><dt>Ahorro</dt><dd data-savings></dd></div>
            <div><dt>Envío</dt><dd data-shipping></dd></div>
            <div class="grand"><dt>Total</dt><dd data-total></dd></div>
          </dl>
          <ul class="summary-trust"><li>${icons.truck} Entrega en ${SITE.deliveryDays}</li><li>${icons.chat} Ayuda por WhatsApp ${SITE.whatsappDisplay}</li></ul>
        </div>
      </details>
    </aside>
  </div>
</div>

<div class="checkout-bar" data-checkout-bar hidden>
  <div class="cb-total"><span>Total</span><b data-bar-total></b></div>
  <button class="btn btn-cta btn-lg" type="submit" form="checkout-form" data-submit-bar><span data-submit-label-bar>Confirmar pedido</span></button>
</div>`;

  return layout({
    title: 'Finalizar compra | PatchHouse.CR',
    description: 'Completá tu pedido de PatchHouse y pagá con SINPE Móvil o tarjeta.',
    path: '/checkout/',
    main,
    page: 'checkout',
    css: ['/src/styles/checkout.css'],
    noindex: true,
    bodyClass: 'is-checkout'
  });
}
