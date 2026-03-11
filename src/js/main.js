import '../styles/main.css';

const API_BASE_URL = '/api';

const PRODUCTS = {
  'focus': { name: 'Focus Patch', desc: '30 parches', price: 9900 },
  'nad': { name: 'NAD+ Patch', desc: '30 parches', price: 9900 },
  'dopamine': { name: 'Dopamine Patch', desc: '30 parches', price: 9900 },
  'stress': { name: 'Stress Relief Patch', desc: '30 parches', price: 9900 },
  'combo-mente': { name: 'Combo Mente & Energía', desc: 'Focus + NAD', price: 17900, savings: 1900 },
  'combo-mood': { name: 'Combo Mood & Calma', desc: 'Dopamine + Stress', price: 17900, savings: 1900 },
  'combo-full': { name: 'Combo Full House', desc: '4 paquetes', price: 34900, savings: 4700 }
};

const SHIPPING_COST = 2600;

const cart = {};

function metaTrack(eventName, params, options) {
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      if (params && options) {
        window.fbq('track', eventName, params, options);
      } else if (params) {
        window.fbq('track', eventName, params);
      } else {
        window.fbq('track', eventName);
      }
    }
  } catch {
    // no-op
  }
}

function getCartEntries() {
  return Object.entries(cart).filter(([, qty]) => qty > 0);
}

function getCartItemsForMeta() {
  const entries = getCartEntries();
  return entries
    .map(([key, qty]) => {
      const p = PRODUCTS[key];
      if (!p) return null;
      return { key, qty, product: p };
    })
    .filter(Boolean);
}

function getCartMetaValue() {
  const items = getCartItemsForMeta();
  return items.reduce((sum, it) => sum + (it.product.price * it.qty), 0);
}

function getMetaContentIdsFromItems(items) {
  return items.map(it => it.key);
}

function trackViewContent(productKey) {
  const p = PRODUCTS[productKey];
  if (!p) return;
  metaTrack('ViewContent', {
    content_ids: [productKey],
    content_name: p.name,
    content_type: 'product',
    value: p.price,
    currency: 'CRC'
  });
}

function trackAddToCart(productKey, quantity) {
  const p = PRODUCTS[productKey];
  if (!p) return;
  metaTrack('AddToCart', {
    content_ids: [productKey],
    content_name: p.name,
    content_type: 'product',
    value: p.price * quantity,
    currency: 'CRC'
  });
}

function trackInitiateCheckout() {
  const items = getCartItemsForMeta();
  if (items.length === 0) return;
  metaTrack('InitiateCheckout', {
    content_ids: getMetaContentIdsFromItems(items),
    content_type: 'product',
    num_items: items.reduce((sum, it) => sum + it.qty, 0),
    value: getCartMetaValue(),
    currency: 'CRC'
  });
}

function formatCRC(amount) {
  return `₡${amount.toLocaleString('es-CR')}`;
}

// --- Navigation ---
const nav = document.getElementById('nav');
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');

window.addEventListener('scroll', () => {
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
});

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

// --- Smooth Scroll ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// --- Cart System ---
function setCartQty(productKey, qty) {
  const prevQty = cart[productKey] || 0;
  if (qty <= 0) {
    delete cart[productKey];
  } else {
    cart[productKey] = Math.min(qty, 10);
  }
  const nextQty = cart[productKey] || 0;
  if (nextQty > prevQty && prevQty === 0) {
    trackAddToCart(productKey, nextQty);
  }
  syncAllQtyDisplays();
  updateTotals();
}

function syncAllQtyDisplays() {
  document.querySelectorAll('.qty-control').forEach(ctrl => {
    const key = ctrl.dataset.product;
    const qty = cart[key] || 0;
    const display = ctrl.querySelector('.qty-value');
    if (display) display.textContent = qty;
  });

  document.querySelectorAll('.patch-detail').forEach(detail => {
    const ctrl = detail.querySelector('.qty-control');
    if (ctrl) {
      const key = ctrl.dataset.product;
      const qty = cart[key] || 0;
      detail.classList.toggle('in-cart', qty > 0);
    }
  });

  document.querySelectorAll('.combo-card').forEach(card => {
    const ctrl = card.querySelector('.qty-control');
    if (ctrl) {
      const key = ctrl.dataset.product;
      const qty = cart[key] || 0;
      card.classList.toggle('in-cart', qty > 0);
    }
  });
}

function updateTotals() {
  const summarySubtotal = document.getElementById('summary-subtotal');
  const summaryTotal = document.getElementById('summary-total');
  const itemsInput = document.getElementById('items-data');

  const entries = Object.entries(cart).filter(([, qty]) => qty > 0);

  let subtotal = 0;
  entries.forEach(([key, qty]) => {
    const p = PRODUCTS[key];
    if (p) subtotal += p.price * qty;
  });

  const total = entries.length > 0 ? subtotal + SHIPPING_COST : SHIPPING_COST;

  if (summarySubtotal) summarySubtotal.textContent = formatCRC(subtotal);
  if (summaryTotal) summaryTotal.textContent = formatCRC(total);

  if (itemsInput) {
    const itemsArray = entries.map(([key, qty]) => ({ key, qty }));
    itemsInput.value = JSON.stringify(itemsArray);
  }

  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn) {
    submitBtn.disabled = entries.length === 0;
    submitBtn.textContent = entries.length === 0 ? 'Agregá productos para continuar' : 'Confirmar Pedido';
  }
}

function bindQtyButtons(scope) {
  (scope || document).querySelectorAll('.qty-control .qty-btn').forEach(btn => {
    if (btn._bound) return;
    btn._bound = true;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const ctrl = this.closest('.qty-control');
      const key = ctrl.dataset.product;
      const action = this.dataset.action;
      const current = cart[key] || 0;
      setCartQty(key, action === 'increase' ? current + 1 : current - 1);
    });
  });
}

bindQtyButtons(document);
syncAllQtyDisplays();
updateTotals();

// --- Meta: basic product impressions ---
function setupMetaViewContentObservers() {
  const productKeys = Object.keys(PRODUCTS);
  const seen = new Set();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const key = entry.target.getAttribute('data-meta-product');
        if (!key || seen.has(key)) return;
        seen.add(key);
        trackViewContent(key);
      });
    },
    { threshold: 0.55 }
  );

  productKeys.forEach(key => {
    const el = document.querySelector(`.qty-control[data-product="${key}"]`);
    if (!el) return;
    const container = el.closest('.patch-detail, .combo-card') || el;
    container.setAttribute('data-meta-product', key);
    observer.observe(container);
  });
}

if (typeof window !== 'undefined' && typeof IntersectionObserver !== 'undefined') {
  setupMetaViewContentObservers();
}

// --- Payment Method ---
const paymentMethodSelect = document.getElementById('metodo-pago');
const paymentInfoBox = document.getElementById('payment-info');

if (paymentMethodSelect && paymentInfoBox) {
  paymentMethodSelect.addEventListener('change', function () {
    const method = this.value;
    if (method === 'SINPE') {
      paymentInfoBox.style.display = 'block';
      paymentInfoBox.innerHTML = `
        <div class="payment-instructions sinpe">
          <h4>SINPE Móvil</h4>
          <div style="background: #f8f8f9; padding: 14px; border-radius: 10px; margin: 12px 0; border-left: 3px solid var(--primary, #3a8f6a);">
            <p style="margin: 4px 0;"><strong>Número:</strong> <span style="font-size: 1.05em; color: #3a3a4a;">6201-9914</span></p>
            <p style="margin: 4px 0;"><strong>Nombre:</strong> Rafael Garcia</p>
          </div>
          <ul>
            <li>Usá el número de tu orden en el concepto del SINPE</li>
            <li>Guardá el comprobante de pago</li>
            <li>Enviá el comprobante por <a href="https://wa.me/50670526254" target="_blank" style="color: var(--primary, #3a8f6a); font-weight: 600;">WhatsApp</a></li>
          </ul>
        </div>
      `;
    } else if (method === 'Tarjeta') {
      paymentInfoBox.style.display = 'block';
      paymentInfoBox.innerHTML = `
        <div class="payment-instructions tilopay">
          <h4>Pago con Tarjeta</h4>
          <p>Serás redirigido a la pasarela de pago segura de Tilopay para completar tu compra.</p>
          <p>Aceptamos todas las tarjetas de crédito y débito.</p>
        </div>
      `;
    } else {
      paymentInfoBox.style.display = 'none';
    }
  });
}

// --- FAQ Accordion ---
document.querySelectorAll('.faq-question').forEach(question => {
  question.addEventListener('click', function () {
    const item = this.parentElement;
    const wasActive = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
    if (!wasActive) item.classList.add('active');
  });
});

// --- Form Submission ---
const orderForm = document.getElementById('order-form');

if (orderForm) {
  orderForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const entries = getCartEntries();
    if (entries.length === 0) {
      showMessage('Por favor, agregá al menos un producto', 'error');
      return;
    }

    const formData = new FormData(orderForm);
    const data = Object.fromEntries(formData);

    const paymentMethod = data['metodo-pago'];
    if (!paymentMethod) {
      showMessage('Por favor, seleccioná un método de pago', 'error');
      return;
    }

    if (!data.nombre || !data.telefono || !data.email || !data.provincia || !data.canton || !data.distrito || !data.direccion) {
      showMessage('Por favor, completá todos los campos requeridos', 'error');
      return;
    }

    showLoading(true);

    try {
      if (paymentMethod === 'SINPE') {
        trackInitiateCheckout();
        await handleSinpePayment(data);
      } else if (paymentMethod === 'Tarjeta') {
        await handleTilopayPayment(data);
      }
    } catch (error) {
      console.error('Payment error:', error);
      showMessage('Error al procesar el pedido. Por favor, intentá de nuevo.', 'error');
      showLoading(false);
    }
  });
}

async function handleSinpePayment(data) {
  const response = await fetch(`${API_BASE_URL}/email/send-sinpe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) throw new Error('Failed to process SINPE order');

  const result = await response.json();
  showLoading(false);

  if (paymentInfoBox) paymentInfoBox.style.display = 'none';

  showMessage(
    `¡Pedido recibido! Número de orden: ${result.orderId}. Revisá tu correo para las instrucciones de pago SINPE.`,
    'success'
  );

  metaTrack('Lead', {
    value: getCartMetaValue(),
    currency: 'CRC'
  });

  Object.keys(cart).forEach(k => delete cart[k]);
  orderForm.reset();
  syncAllQtyDisplays();
  updateTotals();
}

async function handleTilopayPayment(data) {
  const response = await fetch(`${API_BASE_URL}/tilopay/create-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.message || 'Failed to create payment link');
  }

  const result = await response.json();
  showLoading(false);

  if (result.paymentUrl) {
    if (result.metaEventId) {
      metaTrack('InitiateCheckout', {
        content_ids: getMetaContentIdsFromItems(getCartItemsForMeta()),
        content_type: 'product',
        num_items: getCartItemsForMeta().reduce((sum, it) => sum + it.qty, 0),
        value: getCartMetaValue(),
        currency: 'CRC'
      }, { eventID: result.metaEventId });
    }
    window.location.href = result.paymentUrl;
  } else {
    throw new Error('No payment URL received');
  }
}

function showMessage(text, type = 'success') {
  const existing = document.querySelector('.message');
  if (existing) existing.remove();

  const msg = document.createElement('div');
  msg.className = `message ${type}`;
  msg.textContent = text;

  if (orderForm) {
    orderForm.parentNode.insertBefore(msg, orderForm);
    msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => msg.remove(), 8000);
  }
}

function showLoading(show) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = show ? 'flex' : 'none';
}
