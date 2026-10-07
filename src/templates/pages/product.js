import { SITE, FAQ, COMMON_USAGE, REVIEWS, REVIEWS_ARE_PLACEHOLDERS, reviewSummary, formatCRC, shippingNote, SHIPPING_COST, SINGLE_PRICE, FREE_SHIPPING_FROM } from '../../../shared/catalog.js';
import { layout, esc, faqList, faqJsonLd, icons } from '../layout.js';
import { productCard, productImage, priceBlock, reels, benefitCards, stepCards } from '../components.js';

const BENEFIT_ICONS = ['pulse', 'clock', 'heart', 'leaf'];

const stars = (avg) => '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));
const ogImage = (p) => `/images/${p.image}-og.jpg`;

function gallery(p, cat) {
  const isCombo = p.kind === 'combo';
  const members = p.includes.map((k) => cat.products[k]);
  const photo = isCombo
    ? `<img src="${productImage(p, 'gallery')}" alt="${esc(p.name)}: ${esc(members.map((m) => m.name).join(', '))}" width="1000" height="1000" fetchpriority="high" decoding="async">`
    : `<img src="${productImage(p, 'gallery')}" srcset="${productImage(p, 'card')} 520w, ${productImage(p, 'gallery')} 1000w" sizes="(min-width: 900px) 560px, 100vw" alt="${esc(p.name)}, paquete de 30 parches" width="1000" height="1000" fetchpriority="high" decoding="async">`;
  const slides = [{ label: null, thumb: productImage(p, 'thumb'), html: photo }];
  if (!isCombo) {
    slides.push({ label: 'En color', thumb: `/images/${p.key}-studio-thumb.webp`, html: `<img src="/images/${p.key}-studio-gallery.webp" alt="${esc(p.name)} sobre fondo de color" width="1000" height="1000" loading="lazy" decoding="async">` });
    slides.push({ label: '¿Qué son?', thumb: `/images/${p.key}-info-thumb.webp`, html: `<img src="/images/${p.key}-info.webp" alt="Qué son los parches de bienestar: capa superior, adhesivo suave, vitaminas y extractos de ${esc(p.name)}" width="1000" height="1000" loading="lazy" decoding="async">` });
  }

  if (isCombo) {
    slides.push({
      label: 'Qué incluye',
      html: `<div class="slide-html"><h2>Qué incluye</h2><ul class="inc-list">${members.map((m) => `<li><img src="${productImage(m, 'thumb')}" alt="" width="48" height="48" loading="lazy"><div><b>${esc(m.name)}</b><span>${esc(m.tagline)}</span></div><em>${formatCRC(SINGLE_PRICE)}</em></li>`).join('')}</ul><p class="slide-note">Juntos: <b>${formatCRC(p.price)}</b> en vez de ${formatCRC(p.compareAt)}. Cada paquete trae 30 parches.</p></div>`
    });
  } else {
    slides.push({ label: 'Beneficios', thumb: `/images/${p.key}-benefits-thumb.webp`, html: `<img src="/images/${p.key}-benefits.webp" alt="Beneficios de ${esc(p.name)}: ${esc(p.benefits.join('; '))}" width="1000" height="1000" loading="lazy" decoding="async">` });
    slides.push({ label: 'Ingredientes', html: `<div class="slide-html"><h2>Ingredientes clave</h2><ul class="ing-list">${p.ingredients.map(([n, r]) => `<li><b>${esc(n)}</b><span>${esc(r)}</span></li>`).join('')}</ul></div>` });
  }
  slides.push({ label: 'Cómo usar', html: `<div class="slide-html"><h2>Así se usa</h2><ol class="num-list">${COMMON_USAGE.map((s, i) => `<li><i>${i + 1}</i><div><b>${esc(s.title)}</b><span>${esc(s.text)}</span></div></li>`).join('')}</ol></div>` });
  slides.push({ label: '▶ Video', html: `<a class="slide-video" href="#videos"><img src="/images/vid1-poster.webp" alt="" width="360" height="640" loading="lazy"><span class="play" aria-hidden="true">▶</span><b>Mirá cómo se aplica</b></a>` });
  if (!isCombo) {
    slides.push({ label: 'Qué recibís', html: `<div class="slide-html"><h2>Qué recibís</h2><div class="big-facts"><div><b>30</b>parches por paquete</div><div><b>1</b>parche al día</div><div><b>1 mes</b>de rutina</div></div><p class="slide-note">Envío a todo Costa Rica en ${SITE.deliveryDays}.</p></div>` });
  }

  const slideHtml = slides.map((s, i) => `<div class="slide${i === 0 ? ' on' : ''}" data-slide="${i}" role="tabpanel" aria-label="${esc(s.label || 'Foto del producto')}"${i === 0 ? '' : ' hidden'}>${s.html}</div>`).join('');
  const thumbs = slides.map((s, i) => `<button type="button" class="th${i === 0 ? ' on' : ''}" data-thumb="${i}" role="tab" aria-selected="${i === 0}" aria-label="${esc(s.label || 'Foto del producto')}">${s.thumb ? `<img src="${s.thumb}" alt="" width="76" height="76" loading="lazy">` : esc(s.label)}</button>`).join('');

  return `
<div class="pdp-gallery" data-gallery>
  <div class="gal-main">${p.badge && !cat.isSoldOut(p.key) ? `<span class="tag${isCombo ? ' save' : ''}">${esc(p.badge)}</span>` : ''}<div class="slides">${slideHtml}</div>
    <button class="gal-nav prev" type="button" aria-label="Anterior" data-gal-prev>‹</button><button class="gal-nav next" type="button" aria-label="Siguiente" data-gal-next>›</button>
  </div>
  <div class="thumbs" role="tablist" aria-label="Galería">${thumbs}</div>
</div>`;
}

/** "Elegí tu opción": this product alone or a combo that includes it, with the savings visible. */
function optionPicker(p, cat) {
  const isCombo = p.kind === 'combo';
  const available = cat.combos().filter((c) => !cat.isSoldOut(c.key) && c.key !== p.key);
  const related = isCombo
    ? available.filter((c) => c.key !== 'combo-full' && c.includes.some((k) => p.includes.includes(k)))
    : available.filter((c) => c.key !== 'combo-full' && c.includes.includes(p.key));
  related.sort((a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0) || a.includes.length - b.includes.length || b.savings - a.savings); // best seller first
  const full = available.find((c) => c.key === 'combo-full' && (isCombo || c.includes.includes(p.key)));
  const options = [p, ...related.slice(0, full ? 2 : 3), ...(full ? [full] : [])];
  if (options.length < 2) return '';

  const row = (o, i) => {
    const members = o.includes.map((k) => cat.products[k].short).join(' + ');
    const title = i === 0 ? (isCombo ? o.name : `Solo ${o.name}`) : o.name;
    const sub = i === 0 && !isCombo ? '1 paquete · 30 parches' : members;
    const tag = o.key === 'combo-full' ? 'MEJOR AHORRO' : (o.badge ? o.badge.toUpperCase() : '');
    return `<label class="opt${i === 0 ? ' on' : ''}">
      ${tag && i > 0 ? `<span class="opt-tag">${esc(tag)}</span>` : ''}
      <input type="radio" name="opt" value="${o.key}" data-name="${esc(o.short)}"${i === 0 ? ' checked' : ''}>
      <span class="radio" aria-hidden="true"></span>
      <img src="/images/${o.cardImage || o.image}-thumb.webp" alt="" width="52" height="52" loading="lazy">
      <span class="opt-main"><b>${esc(title)}</b><span>${esc(sub)}</span></span>
      <span class="opt-price"><b>${formatCRC(o.price)}</b>${o.savings ? `<s>${formatCRC(o.compareAt)}</s><em>Ahorrás ${formatCRC(o.savings)}</em>` : ''}</span>
    </label>`;
  };
  return `<fieldset class="options" data-options><legend class="lbl">${isCombo ? 'Elegí tu combo' : 'Elegí tu opción · ahorrá con un combo'}</legend>${options.map(row).join('')}</fieldset>`;
}

function comboQty() {
  return `<div class="qty-row" id="pack"><span class="lbl">Cantidad</span><div class="qty" data-qty-ctl><button type="button" aria-label="Reducir cantidad" data-qty-minus>−</button><output aria-live="polite" data-qty-out>1</output><button type="button" aria-label="Aumentar cantidad" data-qty-plus>+</button></div></div>`;
}

export function productPage(p, cat) {
  const isCombo = p.kind === 'combo';
  const sold = cat.isSoldOut(p.key);
  const members = p.includes.map((k) => cat.products[k]);
  const lead = p; // combos have their own composed image
  const summary = reviewSummary(p.key);
  const reviews = REVIEWS[p.key] || [];
  const startPrice = p.price;

  const bullets = isCombo
    ? members.map((m) => `<li><b>${esc(m.name)}</b> → ${esc(m.tagline.toLowerCase())}</li>`).join('')
    : p.bullets.map(([f, b]) => `<li><b>${esc(f)}</b> → ${esc(b)}</li>`).join('');
  const result = isCombo
    ? `${members.length} fórmulas en un solo pedido: ${members.map((m) => m.short).join(', ')}. Pagás menos por cada paquete.`
    : p.result;

  const buy = sold
    ? `<div class="soldout-box"><b>Agotado por ahora</b><p>${esc(cat.config.soldOutMessage)}</p><a class="btn btn-wa btn-block" href="https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(`Hola PatchHouse, avísenme cuando vuelva ${p.name}`)}" target="_blank" rel="noopener">Avisarme por WhatsApp</a></div>`
    : `${optionPicker(p, cat)}
      ${comboQty()}
      <div class="buy-actions">
        <button class="btn btn-cta btn-lg btn-block" type="button" id="atc" data-add="${p.key}">Agregar al carrito · <span data-atc-price>${formatCRC(startPrice)}</span></button>
        <button class="btn btn-dark btn-block" type="button" data-buy-now="${p.key}">Comprar ahora</button>
      </div>`;

  const trust = `<ul class="micro-trust">
    <li>${icons.truck}<div><b>Envío gratis desde ${formatCRC(FREE_SHIPPING_FROM)}</b><span>A todo el país · ${SITE.deliveryDays}</span></div></li>
    <li>${icons.lock}<div><b>Pago seguro</b><span>SINPE Móvil o tarjeta</span></div></li>
    <li>${icons.chat}<div><b>Atención por WhatsApp</b><span>${SITE.whatsappDisplay}</span></div></li>
  </ul>`;

  const accordions = `<div class="acc">
    ${isCombo ? '' : `<details><summary>Ingredientes</summary><div class="body"><ul class="ing-plain">${p.ingredients.map(([n, r]) => `<li><b>${esc(n)}</b>: ${esc(r)}</li>`).join('')}</ul></div></details>`}
    <details><summary>Cómo se usa</summary><div class="body"><p>Despegá el parche, aplicalo en zona limpia y seca (brazo, hombro o espalda) y dejalo actuar hasta 24 horas. Cambialo cada día. Cada paquete trae 30 parches.</p></div></details>
    <details><summary>Envíos y retiro</summary><div class="body"><p>Envío gratis en pedidos de ${formatCRC(FREE_SHIPPING_FROM)} o más; si no, ${formatCRC(SHIPPING_COST)}. A todo Costa Rica por Correos de Costa Rica o mensajería privada, en ${SITE.deliveryDays}. Retiro en ${SITE.pickup}.</p></div></details>
  </div>
  <p class="fineprint">${p.note ? esc(p.note) + ' ' : ''}Suplemento de bienestar. No es un medicamento ni sustituye un tratamiento médico. Si tenés una condición médica, tomás medicamentos, estás embarazada o en lactancia, consultá con tu médico antes de usarlo.</p>`;

  const reviewsHtml = reviews.length ? `
<section class="section alt" id="resenas"><div class="container">
  <div class="section-head"><span class="eyebrow">Reseñas</span><h2>${summary.count} ${summary.count === 1 ? 'reseña' : 'reseñas'} · ${String(summary.average).replace('.', ',')} de 5</h2></div>
  <div class="reviews">${reviews.map((r) => `<article class="review"><div class="stars" aria-label="${r.rating} de 5">${stars(r.rating)}</div><h3>${esc(r.title || '')}</h3><p>${esc(r.text)}</p><span class="who">${esc(r.author)}${r.city ? ` · ${esc(r.city)}` : ''}${r.verified ? ' · <b>✓ Compra verificada</b>' : ''}</span></article>`).join('')}</div>
</div></section>` : '';

  const cross = isCombo
    ? cat.combos().filter((c) => c.key !== p.key).slice(0, 3)
    : [...cat.combos().filter((c) => c.includes.includes(p.key)), ...cat.patches().filter((x) => x.key !== p.key)].slice(0, 3);
  const crossTitle = isCombo ? 'Otros combos que te pueden gustar' : 'Combinalo y ahorrá';

  const benefitItems = isCombo
    ? members.map((m, i) => ({ icon: BENEFIT_ICONS[i % 4], title: m.name, text: m.tagline }))
    : p.benefits.map((b, i) => ({ icon: BENEFIT_ICONS[i % 4], title: b, text: '' }));

  const main = `
<div class="container">
  <ol class="crumbs" aria-label="Ruta de navegación"><li><a href="/">Inicio</a></li><li><a href="/#${isCombo ? 'combos' : 'tienda'}">${isCombo ? 'Combos' : 'Parches'}</a></li><li aria-current="page">${esc(p.name)}</li></ol>
  <section class="pdp" data-product="${p.key}">
    ${gallery(p, cat)}
    <div class="pdp-buy">
      <h1>${esc(p.name)}</h1>
      ${summary ? `<a class="rating" href="#resenas"><span class="stars" aria-hidden="true">${stars(summary.average)}</span> ${String(summary.average).replace('.', ',')} · ${summary.count} reseñas</a>` : ''}
      <p class="result">${esc(result)}</p>
      <div class="price-box" data-price-box>${priceBlock(p, { unit: false })}<small>${isCombo ? esc(p.unitLabel) : 'Paquete de 30 parches · 1 mes de uso'}</small><p class="ship-note${startPrice >= FREE_SHIPPING_FROM ? ' free' : ''}" data-ship-note>${icons.truck}<span>${esc(shippingNote(startPrice))}</span></p></div>
      <ul class="bullets">${bullets}</ul>
      ${buy}
      ${trust}
      ${accordions}
    </div>
  </section>
</div>

<section class="section">
  <div class="container">
    <div class="section-head center"><span class="eyebrow">${isCombo ? 'Qué incluye' : 'Por qué ' + esc(p.short)}</span><h2>${isCombo ? 'Todo lo que recibís en este combo' : 'Lo que podés esperar'}</h2></div>
    ${benefitCards(benefitItems)}
  </div>
</section>

${isCombo ? '' : `<section class="section alt"><div class="container">
  <div class="section-head center"><span class="eyebrow">Ingredientes</span><h2>Qué lleva ${esc(p.name)}</h2></div>
  <ul class="ing-grid">${p.ingredients.map(([n, r]) => `<li><b>${esc(n)}</b><span>${esc(r)}</span></li>`).join('')}</ul>
</div></section>`}

<section class="section${isCombo ? ' alt' : ''}" id="como-funciona"><div class="container">
  <div class="section-head center"><span class="eyebrow">Cómo se usa</span><h2>Tres pasos, cero complicaciones</h2></div>
  ${stepCards(COMMON_USAGE)}
</div></section>

<section class="section${isCombo ? '' : ' alt'}" id="videos"><div class="container">
  <div class="section-head"><span class="eyebrow">En uso</span><h2>Miralo en acción</h2><p>Videos cortos de cómo se aplican los parches.</p></div>
  ${reels()}
</div></section>

${reviewsHtml}

<section class="section${reviews.length ? '' : ' alt'}" id="faq"><div class="container">
  <div class="section-head center"><span class="eyebrow">FAQ</span><h2>Preguntas frecuentes</h2></div>
  ${faqList(FAQ)}
</div></section>

<section class="section"><div class="container">
  <div class="section-head"><span class="eyebrow">Seguí explorando</span><h2>${crossTitle}</h2></div>
  <div class="grid">${cross.map((c) => productCard(c, cat)).join('')}</div>
</div></section>

<section class="section"><div class="container">
  <div class="cta-final"><h2>${sold ? 'Mirá otras fórmulas disponibles' : 'Listo para empezar'}</h2><p>${sold ? 'Este producto vuelve pronto. Mientras tanto, mirá el resto de la tienda.' : 'Elegí tu pack, pagá con SINPE Móvil o tarjeta y recibilo en todo el país.'}</p>
  ${sold ? '<a class="btn btn-cta btn-lg" href="/#tienda">Ver la tienda</a>' : '<a class="btn btn-cta btn-lg" href="#pack">Elegir mi pack</a>'}</div>
</div></section>`;

  const tail = sold ? '' : `
<div class="sticky-bar" data-sticky aria-hidden="true">
  <img src="${productImage(lead, 'thumb')}" alt="" width="44" height="44">
  <div class="sb-info"><b>${esc(p.short)}</b><span data-sticky-price>${formatCRC(startPrice)}</span></div>
  <button class="btn btn-cta" type="button" data-sticky-add tabindex="-1">Agregar</button>
</div>`;

  const url = `${SITE.url}${p.path}`;
  const jsonld = [
    {
      '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.key,
      description: `${p.tagline || result}. ${p.unitLabel}.`,
      image: [`${SITE.url}${ogImage(lead)}`],
      brand: { '@type': 'Brand', name: 'PatchHouse' },
      ...(summary && !REVIEWS_ARE_PLACEHOLDERS ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: summary.average, reviewCount: summary.count } } : {}),
      offers: { '@type': 'Offer', url, priceCurrency: 'CRC', price: p.price, itemCondition: 'https://schema.org/NewCondition', availability: sold ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock' }
    },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE.url },
      { '@type': 'ListItem', position: 2, name: p.name, item: url }
    ] },
    faqJsonLd(FAQ)
  ];

  return layout({
    title: `${p.name} – ${isCombo ? 'ahorrá combinando parches' : p.tagline} | PatchHouse.CR`,
    description: `${p.name}: ${result} desde ${formatCRC(p.price)}. Pagá con SINPE Móvil o tarjeta. Envíos a todo Costa Rica.`.slice(0, 300),
    path: p.path,
    image: ogImage(lead),
    ogType: 'product',
    main, tail, jsonld,
    page: 'pdp',
    css: ['/src/styles/pdp.css'],
    bodyClass: sold ? '' : 'has-sticky-bar',
    head: isCombo
      ? `<link rel="preload" as="image" type="image/webp" href="${productImage(p, 'gallery')}" fetchpriority="high">`
      : `<link rel="preload" as="image" type="image/webp" href="${productImage(p, 'gallery')}" imagesrcset="${productImage(p, 'card')} 520w, ${productImage(p, 'gallery')} 1000w" imagesizes="(min-width: 900px) 560px, 100vw" fetchpriority="high">`
  });
}
