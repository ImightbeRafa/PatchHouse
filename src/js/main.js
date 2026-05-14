import '../styles/main.css';

const API_BASE_URL = '/api';

const SINGLE_PATCH_PRICE = 9900;
const SINGLE_PATCH_ORDER = ['focus', 'nad', 'energy', 'glp1', 'dopamine', 'stress'];
const SINGLE_PATCH_PRODUCTS = {
  'focus': { name: 'Focus Patch', desc: '30 parches', price: SINGLE_PATCH_PRICE },
  'nad': { name: 'NAD+ Patch', desc: '30 parches', price: SINGLE_PATCH_PRICE },
  'energy': { name: 'Energy Patch', desc: '30 parches', price: SINGLE_PATCH_PRICE },
  'glp1': { name: 'GLP-1 Patch', desc: '30 parches', price: SINGLE_PATCH_PRICE },
  'dopamine': { name: 'Dopamine Patch', desc: '30 parches', price: SINGLE_PATCH_PRICE },
  'stress': { name: 'Stress Relief Patch', desc: '30 parches', price: SINGLE_PATCH_PRICE }
};

const STATIC_COMBO_PRODUCTS = {
  'combo-energia-foco': { name: 'Combo Energía & Foco', desc: 'Energy + Focus', price: 17900, savings: 1900 },
  'combo-metabolismo': { name: 'Combo Metabolismo & Energía', desc: 'GLP-1 + Energy', price: 17900, savings: 1900 },
  'combo-mood': { name: 'Combo Mood & Calma', desc: 'Dopamine + Stress', price: 17900, savings: 1900 },
  'combo-foco-calma': { name: 'Combo Foco & Calma', desc: 'Focus + Stress', price: 17900, savings: 1900 },
  'combo-trio': { name: 'Combo Trío Bienestar', desc: 'Focus + GLP-1 + Stress', price: 26900, savings: 2800 }
};

const SHIPPING_COST = 3000;

// ── Sold-out configuration ──────────────────────────────────────────
// Driven by env vars so you can toggle without code changes.
// VITE_SOLD_OUT        → comma-separated product keys (e.g. "stress,dopamine")
// VITE_COMBO_EXCLUDED  → comma-separated keys to sell only as individual products
// VITE_SOLD_OUT_MESSAGE → banner text shown on sold-out products
// Set them in .env (local) or Vercel dashboard (production).
const SOLD_OUT = (import.meta.env.VITE_SOLD_OUT || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const COMBO_EXCLUDED = (import.meta.env.VITE_COMBO_EXCLUDED || 'nad')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const SOLD_OUT_MESSAGE = import.meta.env.VITE_SOLD_OUT_MESSAGE || '¡Vuelve pronto! Llega en 10 días';

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

const PATCH_ASSETS = {
  focus: { label: 'Focus', image: '/images/focus.jpg' },
  nad: { label: 'NAD', image: '/images/nad.jpg' },
  energy: { label: 'Energy', image: '/images/energy.jpg' },
  glp1: { label: 'GLP-1', image: '/images/glp1.jpg' },
  dopamine: { label: 'Dopamine', image: '/images/dopamine.jpg' },
  stress: { label: 'Stress', image: '/images/stressdown.jpg' }
};

function getAvailableFullHousePatchKeys() {
  return SINGLE_PATCH_ORDER.filter(key => !SOLD_OUT.includes(key) && !COMBO_EXCLUDED.includes(key));
}

function getFullHousePrice(count) {
  const override = Number.parseInt(import.meta.env[`VITE_FULL_HOUSE_PRICE_${count}`], 10);
  return Number.isFinite(override) && override > 0 ? override : FULL_HOUSE_PRICE_BY_COUNT[count];
}

function getFullHouseProduct() {
  const patchCount = getAvailableFullHousePatchKeys().length;
  if (patchCount < 2) return null;

  const oldPrice = patchCount * SINGLE_PATCH_PRICE;
  const price = getFullHousePrice(patchCount) || oldPrice;
  return {
    name: 'Combo Full House',
    desc: `${patchCount} paquetes`,
    price,
    savings: Math.max(oldPrice - price, 0)
  };
}

const fullHouseProduct = getFullHouseProduct();
const COMBO_CONTENTS = {
  ...STATIC_COMBO_CONTENTS,
  ...(fullHouseProduct ? { 'combo-full': getAvailableFullHousePatchKeys() } : {})
};
const PRODUCTS = {
  ...SINGLE_PATCH_PRODUCTS,
  ...STATIC_COMBO_PRODUCTS,
  ...(fullHouseProduct ? { 'combo-full': fullHouseProduct } : {})
};

function isSoldOut(productKey) {
  if (SOLD_OUT.includes(productKey)) return true;
  const contents = COMBO_CONTENTS[productKey];
  if (contents && contents.some(k => SOLD_OUT.includes(k))) return true;
  return false;
}

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

function getCartMetaTotal() {
  const subtotal = getCartMetaValue();
  return subtotal > 0 ? subtotal + SHIPPING_COST : 0;
}

function getMetaContentIdsFromItems(items) {
  return items.map(it => it.key);
}

function getCheckoutFingerprint(data) {
  return JSON.stringify({
    email: String(data.email || '').trim().toLowerCase(),
    telefono: String(data.telefono || '').replace(/\D/g, ''),
    items: getCartEntries(),
    total: getCartMetaTotal()
  });
}

function getOrCreateClientOrderId(data) {
  const storageKey = 'patchhouse_checkout_order';
  const fingerprint = getCheckoutFingerprint(data);
  try {
    const current = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (current && current.fingerprint === fingerprint && /^ORD-\d{10,}-\d{4}$/.test(current.orderId || '')) {
      return current.orderId;
    }
  } catch {
  }

  const orderId = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify({ orderId, fingerprint }));
  } catch {
  }
  return orderId;
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

function formatCRC(amount) {
  return `₡${amount.toLocaleString('es-CR')}`;
}

function getProductContainer(productKey) {
  const ctrl = document.querySelector(`.qty-control[data-product="${productKey}"]`);
  return ctrl ? ctrl.closest('.combo-card, .picker-row, .patch-detail') : null;
}

function hideUnavailableCatalogControls() {
  document.querySelectorAll('.qty-control').forEach(ctrl => {
    const key = ctrl.dataset.product;
    if (!key || PRODUCTS[key]) return;

    const container = ctrl.closest('.combo-card, .picker-row');
    if (container) container.hidden = true;
  });
}

function updateFullHouseDisplay() {
  const product = PRODUCTS['combo-full'];
  const patchKeys = COMBO_CONTENTS['combo-full'] || [];
  const fullHouseCard = getProductContainer('combo-full');

  if (!product || patchKeys.length < 2) {
    if (fullHouseCard) fullHouseCard.hidden = true;
    document.querySelectorAll('.picker-row .qty-control[data-product="combo-full"]').forEach(ctrl => {
      const row = ctrl.closest('.picker-row');
      if (row) row.hidden = true;
    });
    return;
  }

  const oldPrice = patchKeys.length * SINGLE_PATCH_PRICE;
  const names = patchKeys.map(key => PATCH_ASSETS[key].label);
  const description = names.join(' + ');

  document.querySelectorAll('.combo-card .qty-control[data-product="combo-full"]').forEach(ctrl => {
    const card = ctrl.closest('.combo-card');
    if (!card) return;

    const badge = card.querySelector('.combo-badge');
    if (badge) badge.textContent = product.savings > 0 ? `Ahorrás ${formatCRC(product.savings)}` : 'Todos los disponibles';

    const countLabel = card.querySelector('h3 span');
    if (countLabel) countLabel.textContent = product.desc;

    const productsEl = card.querySelector('.combo-products-full');
    if (productsEl) {
      productsEl.innerHTML = patchKeys
        .map(key => `<img src="${PATCH_ASSETS[key].image}" alt="${PATCH_ASSETS[key].label}" loading="lazy">`)
        .join('');
    }

    const text = card.querySelector('p');
    if (text) text.textContent = description;

    const oldPriceEl = card.querySelector('.combo-old-price');
    if (oldPriceEl) oldPriceEl.textContent = formatCRC(oldPrice);

    const priceEl = card.querySelector('.combo-price');
    if (priceEl) priceEl.textContent = formatCRC(product.price);
  });

  document.querySelectorAll('.picker-row .qty-control[data-product="combo-full"]').forEach(ctrl => {
    const row = ctrl.closest('.picker-row');
    const name = row ? row.querySelector('.picker-name') : null;
    if (name) name.innerHTML = `Full House (${patchKeys.length}) <span class="picker-price">${formatCRC(product.price)}</span>`;
  });
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
  if (isSoldOut(productKey)) return;
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

hideUnavailableCatalogControls();
updateFullHouseDisplay();
bindQtyButtons(document);
syncAllQtyDisplays();
updateTotals();

// --- Sold Out State ---
function applySoldOutState() {
  Object.keys(PRODUCTS).forEach(key => {
    if (!isSoldOut(key)) return;

    // Patch detail sections
    const detailSection = document.getElementById('patch-' + key);
    if (detailSection) {
      detailSection.classList.add('sold-out');
      const cta = detailSection.querySelector('.patch-detail-cta');
      if (cta) {
        cta.innerHTML = `
          <div class="sold-out-cta">
            <span class="sold-out-badge">Agotado</span>
            <span class="sold-out-message">${SOLD_OUT_MESSAGE}</span>
          </div>
        `;
      }
    }

    // Combo cards
    document.querySelectorAll(`.combo-card .qty-control[data-product="${key}"]`).forEach(ctrl => {
      const card = ctrl.closest('.combo-card');
      if (card) card.classList.add('sold-out');
    });

    // Checkout picker rows
    document.querySelectorAll(`.picker-row .qty-control[data-product="${key}"]`).forEach(ctrl => {
      const row = ctrl.closest('.picker-row');
      if (row) row.classList.add('sold-out');
    });

    // Hero cards
    const heroLink = document.querySelector(`.hero-card[href="#patch-${key}"]`);
    if (heroLink) heroLink.classList.add('sold-out');
  });
}

applySoldOutState();

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
    const container = el.closest('.patch-detail, .combo-card, .glp-feature') || el;
    container.setAttribute('data-meta-product', key);
    observer.observe(container);
  });
}

if (typeof window !== 'undefined' && typeof IntersectionObserver !== 'undefined') {
  setupMetaViewContentObservers();
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
const checkoutValidationSummary = document.getElementById('checkout-validation-summary');
const checkoutValidationList = document.getElementById('checkout-validation-list');
const checkoutRequiredFields = [
  { name: 'nombre', label: 'nombre y apellido' },
  { name: 'telefono', label: 'número de teléfono' },
  { name: 'email', label: 'correo electrónico' },
  { name: 'provincia', label: 'provincia' },
  { name: 'canton', label: 'cantón' },
  { name: 'distrito', label: 'distrito' },
  { name: 'direccion', label: 'dirección completa' }
];

function getTrimmedFormData(form) {
  const formData = new FormData(form);
  return Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [
    key,
    typeof value === 'string' ? value.trim() : value
  ]));
}

function clearCheckoutValidation() {
  if (checkoutValidationSummary) {
    checkoutValidationSummary.hidden = true;
  }
  if (checkoutValidationList) {
    checkoutValidationList.innerHTML = '';
  }
  if (!orderForm) return;
  orderForm.querySelectorAll('.field-invalid').forEach(group => group.classList.remove('field-invalid'));
  orderForm.querySelectorAll('[aria-invalid="true"]').forEach(field => field.removeAttribute('aria-invalid'));
}

function validateCheckoutData(data) {
  const missing = checkoutRequiredFields
    .filter(field => !String(data[field.name] || '').trim())
    .map(field => field.name);

  const nombreParts = String(data.nombre || '').trim().split(/\s+/).filter(Boolean);
  if (data.nombre && nombreParts.length < 2 && !missing.includes('nombre')) {
    missing.push('nombre');
  }

  const phoneDigits = String(data.telefono || '').replace(/\D/g, '');
  if (data.telefono && phoneDigits.length < 8 && !missing.includes('telefono')) {
    missing.push('telefono');
  }

  const emailField = orderForm ? orderForm.elements.email : null;
  if (data.email && emailField && !emailField.validity.valid && !missing.includes('email')) {
    missing.push('email');
  }

  return missing;
}

function getMissingFieldLabel(fieldName) {
  const field = checkoutRequiredFields.find(item => item.name === fieldName);
  return field ? field.label : fieldName;
}

function showCheckoutValidation(missingFields) {
  clearCheckoutValidation();
  const uniqueMissingFields = Array.from(new Set(missingFields));

  if (checkoutValidationSummary && checkoutValidationList) {
    checkoutValidationList.innerHTML = uniqueMissingFields
      .map(fieldName => `<li>${getMissingFieldLabel(fieldName)}</li>`)
      .join('');
    checkoutValidationSummary.hidden = false;
    checkoutValidationSummary.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    showMessage(`Faltan datos: ${uniqueMissingFields.map(getMissingFieldLabel).join(', ')}`, 'error');
  }

  uniqueMissingFields.forEach(fieldName => {
    const field = orderForm ? orderForm.elements[fieldName] : null;
    if (!field) return;
    field.setAttribute('aria-invalid', 'true');
    const group = field.closest('.form-group');
    if (group) group.classList.add('field-invalid');
  });

  const firstField = orderForm ? orderForm.elements[uniqueMissingFields[0]] : null;
  if (firstField && typeof firstField.focus === 'function') {
    setTimeout(() => firstField.focus({ preventScroll: true }), 250);
  }
}

if (orderForm) {
  orderForm.addEventListener('input', clearCheckoutValidation);
  orderForm.addEventListener('change', clearCheckoutValidation);

  orderForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearCheckoutValidation();

    const entries = getCartEntries();
    if (entries.length === 0) {
      showMessage('Por favor, agregá al menos un producto', 'error');
      return;
    }

    const data = getTrimmedFormData(orderForm);
    const missingFields = validateCheckoutData(data);

    if (missingFields.length > 0) {
      showCheckoutValidation(missingFields);
      return;
    }

    showLoading(true);

    try {
      await handleTilopayPayment(data);
    } catch (error) {
      console.error('Payment error:', error);
      if (Array.isArray(error.missingFields) && error.missingFields.length > 0) {
        showCheckoutValidation(error.missingFields);
        showLoading(false);
        return;
      }
      showMessage('Error al procesar el pedido. Por favor, intentá de nuevo.', 'error');
      showLoading(false);
    }
  });
}

async function handleTilopayPayment(data) {
  data.clientOrderId = getOrCreateClientOrderId(data);

  const response = await fetch(`${API_BASE_URL}/tilopay/create-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const error = new Error(errorData.message || 'Failed to create payment link');
    error.missingFields = errorData.missingFields || [];
    throw error;
  }

  const result = await response.json();
  showLoading(false);

  const paymentUrl = String(result.paymentUrl || '').trim();
  if (/^https?:\/\//i.test(paymentUrl)) {
    if (result.metaEventId) {
      metaTrack('InitiateCheckout', {
        content_ids: getMetaContentIdsFromItems(getCartItemsForMeta()),
        content_type: 'product',
        num_items: getCartItemsForMeta().reduce((sum, it) => sum + it.qty, 0),
        value: getCartMetaTotal(),
        currency: 'CRC'
      }, { eventID: result.metaEventId });
    }
    showRedirectFallback(paymentUrl);
    window.location.assign(paymentUrl);
  } else {
    throw new Error('No payment URL received');
  }
}

function showRedirectFallback(paymentUrl) {
  const existing = document.querySelector('.message');
  if (existing) existing.remove();

  const msg = document.createElement('div');
  msg.className = 'message success';

  const text = document.createElement('span');
  text.textContent = 'Te estamos enviando a Tilopay. Si no abre automáticamente, ';

  const link = document.createElement('a');
  link.href = paymentUrl;
  link.textContent = 'abrilo aquí';

  msg.append(text, link, document.createTextNode('.'));

  if (orderForm) {
    orderForm.parentNode.insertBefore(msg, orderForm);
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
  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn) {
    submitBtn.disabled = show || getCartEntries().length === 0;
    submitBtn.textContent = show ? 'Conectando con Tilopay...' : (getCartEntries().length === 0 ? 'Agregá productos para continuar' : 'Confirmar Pedido');
  }
}
