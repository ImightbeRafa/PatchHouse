/**
 * Product pages for the two lines that came from their own stores:
 *   Sleeping Patch (sleep.shopping)  → dark "night" theme, same price and combos as every patch
 *   Bloom (bloomcr.shopping)         → ivory canvas with a lilac/plum accent, 1 or 2 packs
 * The buy box keeps the same markup as the other product pages, so src/js/pdp.js drives all of them.
 */
import { SITE, FAQ, formatCRC, shippingNote, FREE_SHIPPING_FROM, BLOOM_PRICE, BLOOM_PAIR_PRICE, BLOOM_OPTIONS } from '../../../shared/catalog.js';
import { layout, esc, faqList, faqJsonLd, icons } from '../layout.js';
import { productCard, reels, comboCard } from '../components.js';
import { galleryHtml, optionPicker, comboQty } from './product.js';

const PAY_FAQ = FAQ.filter(([q]) => /pagar|envío/i.test(q));

export const SLEEP_FAQ = [
  ['¿Cómo se usa Sleeping Patch?', 'Despegá un parche nuevo cada noche y aplicalo 1 a 2 horas antes de acostarte en piel limpia, seca y sin vello (muñeca, brazo o cuello). Dejalo puesto durante la noche y retiralo al despertar. Rotá la zona cada día.'],
  ['¿Cuánto dura cada parche?', 'Está diseñado para liberar sus ingredientes de forma gradual durante 6 a 8 horas. Se usa un parche por noche. Cada bolsa trae 30 parches: un mes completo.'],
  ['¿Qué ingredientes tiene?', 'Por parche: melatonina 7 mg, magnesio 41,32 mg, lúpulo 16,53 mg y raíz de valeriana 27 mg.'],
  ['¿Puedo usarlo si tomo medicamentos o estoy embarazada?', 'Consultá a tu médico antes de usarlo si tomás medicamentos, tenés una condición médica, sos menor de 18 años, estás embarazada o en lactancia.'],
  ['¿Puede irritar la piel?', 'Algunas personas con piel sensible pueden notar enrojecimiento en la zona. Si ocurre, retiralo y lavá la zona. No lo apliques sobre heridas o piel irritada.'],
  ['¿Lo puedo combinar con los parches de día?', 'Sí. Usá tus parches de día en la mañana y Sleeping Patch en la noche. Por eso existen los combos Día & Noche (Energy + Sleeping) y Calma 24 h (Stress Relief + Sleeping).'],
  ...PAY_FAQ
];

export const BLOOM_FAQ = [
  ['¿Cómo se usa Bloom?', 'Lavá tu cara y secá bien el área. Presioná el parche sobre el granito por unos segundos y dejalo durante la noche: las micro-agujas se disuelven mientras descansás.'],
  ['¿Cuántos parches trae?', 'Cada paquete trae 9 parches transparentes. Se usa un parche por granito.'],
  ['¿Cuánto cuesta?', `${formatCRC(BLOOM_PRICE)} el paquete o 2 paquetes por ${formatCRC(BLOOM_PAIR_PRICE)}.`],
  ['¿Viaja con mis otros parches?', `Sí. Bloom viaja en el mismo envío que tus parches y suma para el envío gratis desde ${formatCRC(FREE_SHIPPING_FROM)}.`],
  ['¿Lo puedo usar en piel sensible?', 'No lo apliques sobre heridas abiertas ni sobre piel irritada. Si notás irritación, retiralo.'],
  ...PAY_FAQ
];

const microTrust = () => `<ul class="micro-trust">
    <li>${icons.truck}<div><b>Envío gratis desde ${formatCRC(FREE_SHIPPING_FROM)}</b><span>A todo el país · ${SITE.deliveryDays}</span></div></li>
    <li>${icons.lock}<div><b>Pago seguro</b><span>SINPE Móvil o tarjeta</span></div></li>
    <li>${icons.chat}<div><b>Atención por WhatsApp</b><span>${SITE.whatsappDisplay}</span></div></li>
  </ul>`;

const soldOutBox = (p, cat) => `<div class="soldout-box"><b>Agotado por ahora</b><p>${esc(cat.config.soldOutMessage)}</p><a class="btn btn-wa btn-block" href="https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(`Hola PatchHouse, avísenme cuando vuelva ${p.name}`)}" target="_blank" rel="noopener">Avisarme por WhatsApp</a></div>`;

const stickyBar = (p, price, btnClass) => `
<div class="sticky-bar" data-sticky aria-hidden="true">
  <img src="/images/${p.image}-thumb.webp" alt="" width="44" height="44">
  <div class="sb-info"><b>${esc(p.short)}</b><span data-sticky-price>${formatCRC(price)}</span></div>
  <button class="btn ${btnClass}" type="button" data-sticky-add tabindex="-1">Agregar</button>
</div>`;

const videoSlide = (key, label) => ({ label, video: true, thumb: `/images/${key}-poster.webp`, html: `<a class="slide-video" href="#videos"><img src="/images/${key}-poster.webp" alt="" width="540" height="960" loading="lazy"><span class="play" aria-hidden="true">▶</span><b>${esc(label)}</b></a>` });
const photoSlide = (name, alt, label = null) => ({ label: label || alt, thumb: `/images/${name}-thumb.webp`, html: `<img src="/images/${name}-gallery.webp" alt="${esc(alt)}" width="1000" height="1000" loading="lazy" decoding="async">` });

function productLd(p, url, faq, sold, image) {
  return [
    {
      '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.key,
      description: `${p.tagline}. ${p.unitLabel}.`,
      image: [`${SITE.url}${image}`],
      brand: { '@type': 'Brand', name: 'PatchHouse' },
      offers: { '@type': 'Offer', url, priceCurrency: 'CRC', price: p.price, itemCondition: 'https://schema.org/NewCondition', availability: sold ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock' }
    },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE.url },
      { '@type': 'ListItem', position: 2, name: p.name, item: url }
    ] },
    faqJsonLd(faq)
  ];
}

/* ========================================================================== */

export function sleepPage(p, cat) {
  const sold = cat.isSoldOut(p.key);
  const slides = [
    { label: 'Foto del producto', thumb: '/images/sleep-thumb.webp', html: `<img src="/images/sleep-gallery.webp" srcset="/images/sleep-card.webp 520w, /images/sleep-gallery.webp 1000w" sizes="(min-width: 900px) 600px, 100vw" alt="Sleeping Patch, bolsa de 30 parches" width="1000" height="1000" fetchpriority="high" decoding="async">` },
    photoSlide('sleep-muneca-aplicar', 'Aplicando Sleeping Patch en la muñeca'),
    photoSlide('sleep-mesita', 'Sleeping Patch en la mesita de noche'),
    photoSlide('sleep-dormir', 'Sleeping Patch antes de dormir'),
    photoSlide('sleep-despegar', 'Despegando un Sleeping Patch'),
    { label: 'Ingredientes', html: `<div class="slide-html"><h2>Por parche</h2><ul class="ing-list">${p.ingredients.map(([n, r]) => `<li><b>${esc(n)}</b><span>${esc(r)}</span></li>`).join('')}</ul></div>` },
    videoSlide('sleep-ritual', 'Mirá el ritual')
  ];

  const ingCols = p.ingredients.map(([n, r]) => {
    const m = n.match(/^(.*?)\s([\d,]+)\s*mg$/);
    return `<div><div class="n">${m ? `${m[2]} <small>mg</small>` : ''}</div><h3>${esc(m ? m[1] : n)}</h3><p>${esc(r)}</p></div>`;
  }).join('');

  const buy = sold ? soldOutBox(p, cat) : `${optionPicker(p, cat)}
      ${comboQty()}
      <div class="buy-actions">
        <button class="btn btn-gold btn-lg btn-block" type="button" id="atc" data-add="${p.key}">Agregar al carrito · <span data-atc-price>${formatCRC(p.price)}</span></button>
        <button class="btn btn-outline btn-block" type="button" data-buy-now="${p.key}">Comprar ahora</button>
      </div>`;

  const bloom = cat.bloom();
  const day = cat.combos().filter((c) => c.includes.includes('sleep') && !cat.isSoldOut(c.key));

  const main = `
<div class="container">
  <ol class="crumbs" aria-label="Ruta de navegación"><li><a href="/">Inicio</a></li><li><a href="/#tienda">Noche</a></li><li aria-current="page">${esc(p.name)}</li></ol>
  <section class="pdp" data-product="${p.key}">
    ${galleryHtml(slides, sold ? '' : '<span class="tag">Nuevo</span>')}
    <div class="pdp-buy">
      <span class="eyebrow">Nuevo · Colección de noche</span>
      <h1>Sleeping <em>Patch</em></h1>
      <p class="result">${esc(p.result)}</p>
      <div class="price-box" data-price-box><div class="price"><b>${formatCRC(p.price)}</b></div><small>30 parches · 30 noches · mismo precio que todos los parches</small><p class="ship-note" data-ship-note>${icons.truck}<span>${esc(shippingNote(p.price))}</span></p></div>
      <ul class="points">
        <li><b>Ingredientes</b><span>Melatonina, magnesio, lúpulo y raíz de valeriana</span></li>
        <li><b>Liberación</b><span>Gradual sobre la piel, diseñada para 6 a 8 horas</span></li>
        <li><b>Cómo se usa</b><span>Un parche por noche, en muñeca, brazo o cuello</span></li>
      </ul>
      ${buy}
      ${microTrust()}
      <p class="fineprint">${esc(p.note)} Suplemento de bienestar. No es un medicamento ni sustituye un tratamiento médico.</p>
    </div>
  </section>
</div>

<section class="section block" id="ingredientes"><div class="container">
  <div class="section-head split"><div><span class="eyebrow">Por parche</span><h2>Cuatro ingredientes <em>para tu noche.</em></h2></div><p>La misma fórmula de Sleeping Patches, ahora en PatchHouse.</p></div>
  <div class="cols4">${ingCols}</div>
</div></section>

<section class="section block" id="videos"><div class="container">
  <div class="section-head split"><div><span class="eyebrow">En la vida real</span><h2>Miralo <em>en uso.</em></h2></div><p>Videos reales de Sleeping Patch. Tocá el ícono para escuchar.</p></div>
  ${reels(['sleep-ritual', 'sleep-mesita', 'sleep-aplicar', 'sleep-envio'], { line: true })}
</div></section>

<section class="section block" id="como-funciona"><div class="container split">
  <div class="ph"><img src="/images/sleep-hero-1100.webp" srcset="/images/sleep-hero-700.webp 700w, /images/sleep-hero-1100.webp 1100w" sizes="(min-width: 900px) 560px, 100vw" alt="Habitación de noche con Sleeping Patch" width="1100" height="790" loading="lazy" decoding="async"></div>
  <div>
    <span class="eyebrow">Cómo se usa</span>
    <h2 class="h-sec" style="margin-top:12px">Un ritual nocturno, <em>en tres pasos.</em></h2>
    <ol class="moon-steps">${p.usage.map((s, i) => `<li><span class="moon m${i}" aria-hidden="true"></span><div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div></li>`).join('')}</ol>
  </div>
</div></section>

${day.length ? `<section class="section block" id="pack-combos"><div class="container">
  <div class="section-head split"><div><span class="eyebrow">Combos</span><h2>De día y <em>de noche.</em></h2></div><p>Sleeping Patch entra a los combos como cualquier otro parche.</p></div>
  <div class="combos${day.length === 3 ? ' three' : ''}">${day.map((c) => comboCard(c, cat, { feature: c.key === 'combo-full' })).join('')}</div>
</div></section>` : ''}

<section class="section block" id="faq"><div class="container">
  ${bloom && !cat.isSoldOut('bloom') ? `<div class="crossrow skin"><img src="/images/bloom-patch-card.webp" alt="" width="120" height="120" loading="lazy"><div><h3>Completá tu noche con Bloom</h3><p>Parches de micro-agujas para granitos, de uso nocturno. 9 parches por ${formatCRC(BLOOM_PRICE)}.</p></div><a class="btn btn-plum" href="${bloom.path}">Ver Bloom</a></div>` : ''}
  <div class="faq-split">
    <div class="section-head" style="margin:0"><span class="eyebrow">Preguntas</span><h2>Todo lo que <em>necesitás saber.</em></h2></div>
    ${faqList(SLEEP_FAQ)}
  </div>
  <div class="warn"><h3>Usalo con cuidado</h3><ul>${p.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>
</div></section>`;

  const url = `${SITE.url}${p.path}`;
  return layout({
    title: 'Sleeping Patch – parches nocturnos con melatonina y magnesio | PatchHouse.CR',
    description: `Sleeping Patch: melatonina, magnesio, lúpulo y valeriana en un parche por noche. 30 parches por ${formatCRC(p.price)}. Pagá con SINPE Móvil o tarjeta. Envíos a todo Costa Rica.`,
    path: p.path,
    nav: p.path,
    image: '/images/sleep-og.jpg',
    ogType: 'product',
    themeColor: '#0a1730',
    main,
    tail: sold ? '' : stickyBar(p, p.price, 'btn-gold'),
    jsonld: productLd(p, url, SLEEP_FAQ, sold, '/images/sleep-og.jpg'),
    page: 'pdp',
    css: ['/src/styles/pdp.css'],
    bodyClass: `theme-night${sold ? '' : ' has-sticky-bar'}`,
    head: '<link rel="preload" as="image" type="image/webp" href="/images/sleep-gallery.webp" imagesrcset="/images/sleep-card.webp 520w, /images/sleep-gallery.webp 1000w" imagesizes="(min-width: 900px) 600px, 100vw" fetchpriority="high">'
  });
}

/* ========================================================================== */

export function bloomPage(p, cat) {
  const sold = cat.isSoldOut(p.key);
  const slides = [
    { label: 'Foto del producto', thumb: '/images/bloom-thumb.webp', html: `<img src="/images/bloom-gallery.webp" srcset="/images/bloom-card.webp 520w, /images/bloom-gallery.webp 1000w" sizes="(min-width: 900px) 600px, 100vw" alt="Lámina de 9 parches Bloom" width="1000" height="1000" fetchpriority="high" decoding="async">` },
    photoSlide('bloom-patch', 'Un parche Bloom de micro-agujas'),
    videoSlide('bloom-empaque', 'El paquete'),
    videoSlide('bloom-perfil', 'Un parche por granito'),
    { label: 'Cómo usar', html: `<div class="slide-html"><h2>Así se usa</h2><ol class="num-list">${p.usage.map((s, i) => `<li><i>${i + 1}</i><div><b>${esc(s.title)}</b><span>${esc(s.text)}</span></div></li>`).join('')}</ol></div>` }
  ];

  const dots = (n) => `<span class="dots" aria-hidden="true">${'<i></i>'.repeat(n)}</span>`;
  const opts = BLOOM_OPTIONS.map((o, i) => {
    const total = cat.linePrice('bloom', o.qty);
    const save = cat.lineCompare('bloom', o.qty) - total;
    const on = i === BLOOM_OPTIONS.length - 1;
    return `<label class="opt bloom-opt${on ? ' on' : ''}">
      <input type="radio" name="opt" value="bloom" data-qty="${o.qty}" data-name="Bloom"${on ? ' checked' : ''}>
      <span class="radio" aria-hidden="true"></span>
      <span class="opt-main"><b>${esc(o.label)}</b><span>${esc(o.sub)} · ${formatCRC(Math.round(total / (o.qty * 9)))} por parche</span>${dots(o.qty * 9)}</span>
      <span class="opt-price"><b>${formatCRC(total)}</b>${save > 0 ? `<em>Ahorrás ${formatCRC(save)}</em>` : ''}</span>
    </label>`;
  }).join('');
  const startQty = BLOOM_OPTIONS[BLOOM_OPTIONS.length - 1].qty;
  const startPrice = cat.linePrice('bloom', startQty);

  const buy = sold ? soldOutBox(p, cat) : `<fieldset class="options" data-options><legend class="lbl">Elegí tu paquete</legend>${opts}</fieldset>
      <div class="buy-actions">
        <button class="btn btn-plum btn-lg btn-block" type="button" id="atc" data-add="bloom" data-qty="${startQty}">Agregar al carrito · <span data-atc-price>${formatCRC(startPrice)}</span></button>
        <button class="btn btn-outline btn-block" type="button" data-buy-now="bloom" data-qty="${startQty}">Comprar ahora</button>
      </div>`;

  const sleep = cat.products.sleep;
  const main = `
<div class="container">
  <ol class="crumbs" aria-label="Ruta de navegación"><li><a href="/">Inicio</a></li><li><a href="/#tienda">Piel</a></li><li aria-current="page">Bloom</li></ol>
  <section class="pdp" data-product="bloom" data-start-qty="${startQty}">
    ${galleryHtml(slides, sold ? '' : '<span class="tag">Nuevo</span>')}
    <div class="pdp-buy">
      <span class="eyebrow">Nuevo · Piel</span>
      <h1>Bloom <em class="nowrap">Micro-Infusion</em> Patch</h1>
      <p class="result">${esc(p.result)}</p>
      <div class="price-box" data-price-box><div class="price"><b>${formatCRC(startPrice)}</b></div><small>${formatCRC(BLOOM_PRICE)} el paquete · 2 por ${formatCRC(BLOOM_PAIR_PRICE)} · 9 parches por paquete</small><p class="ship-note" data-ship-note>${icons.truck}<span>${esc(shippingNote(startPrice))}</span></p></div>
      <ul class="points">${p.bullets.map(([a, b]) => `<li><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join('')}</ul>
      ${buy}
      <p class="ship-mini"><b>Viaja en el mismo envío</b> que tus parches · gratis desde ${formatCRC(FREE_SHIPPING_FROM)}</p>
      ${microTrust()}
      <p class="fineprint">${esc(p.note)}</p>
    </div>
  </section>
</div>

<section class="section block" id="por-que"><div class="container">
  <div class="section-head split"><div><span class="eyebrow">Por qué Bloom</span><h2>Pequeño, transparente, <em>de noche.</em></h2></div></div>
  <div class="feat">${p.features.map(([t, d], i) => `<div><span class="n">0${i + 1}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join('')}</div>
</div></section>

<section class="section block" id="videos"><div class="container">
  <div class="section-head split"><div><span class="eyebrow">En la vida real</span><h2>Miralo <em>en uso.</em></h2></div><p>Seis videos reales de Bloom. Tocá el ícono para escuchar.</p></div>
  ${reels(['bloom-empaque', 'bloom-perfil', 'bloom-resena', 'bloom-frente', 'bloom-lamina', 'bloom-despegar'], { line: true })}
</div></section>

<section class="section block" id="como-funciona"><div class="container">
  <div class="section-head split"><div><span class="eyebrow">Cómo se usa</span><h2>Lavá, aplicá <em>y dormí.</em></h2></div></div>
  <div class="steps3">${p.usage.map((s, i) => `<div><span class="k">Paso 0${i + 1}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`).join('')}</div>
  ${sleep && !cat.isSoldOut('sleep') ? `<div class="crossrow night"><img src="/images/sleep-card.webp" alt="" width="120" height="120" loading="lazy"><div><h3>Bloom para tu piel, <em>Sleeping para vos.</em></h3><p>Sleeping Patch: melatonina, magnesio, lúpulo y valeriana. 30 noches por ${formatCRC(sleep.price)}.</p></div><a class="btn btn-gold" href="${sleep.path}">Ver Sleeping Patch</a></div>` : ''}
</div></section>

<section class="section block" id="faq"><div class="container">
  <div class="faq-split">
    <div class="section-head" style="margin:0"><span class="eyebrow">Preguntas</span><h2>Todo sobre <em>Bloom.</em></h2></div>
    ${faqList(BLOOM_FAQ)}
  </div>
</div></section>

<section class="section block"><div class="container">
  <div class="section-head split"><div><span class="eyebrow">Seguí explorando</span><h2>Parches para <em>tu día.</em></h2></div></div>
  <div class="grid cols-4">${cat.patches().filter((x) => !cat.isSoldOut(x.key)).slice(0, 4).map((x) => productCard(x, cat)).join('')}</div>
</div></section>`;

  const url = `${SITE.url}${p.path}`;
  return layout({
    title: 'Bloom – parches de micro-agujas para granitos | PatchHouse.CR',
    description: `Bloom: parches transparentes de micro-agujas con ácido hialurónico, 9 por paquete. ${formatCRC(BLOOM_PRICE)} el paquete o 2 por ${formatCRC(BLOOM_PAIR_PRICE)}. Envíos a todo Costa Rica.`,
    path: p.path,
    nav: p.path,
    image: '/images/bloom-og.jpg',
    ogType: 'product',
    main,
    tail: sold ? '' : stickyBar(p, startPrice, 'btn-plum'),
    jsonld: productLd(p, url, BLOOM_FAQ, sold, '/images/bloom-og.jpg'),
    page: 'pdp',
    css: ['/src/styles/pdp.css'],
    bodyClass: `theme-skin${sold ? '' : ' has-sticky-bar'}`,
    head: '<link rel="preload" as="image" type="image/webp" href="/images/bloom-gallery.webp" imagesrcset="/images/bloom-card.webp 520w, /images/bloom-gallery.webp 1000w" imagesizes="(min-width: 900px) 600px, 100vw" fetchpriority="high">'
  });
}

