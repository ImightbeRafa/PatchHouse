import { SITE, FAQ, COMMON_USAGE, formatCRC, SHIPPING_COST, FREE_SHIPPING_FROM, BLOOM_PRICE, BLOOM_PAIR_PRICE, PATCHES } from '../../../shared/catalog.js';
import { layout, esc, faqList, faqJsonLd } from '../layout.js';
import { productCard, reels, reel, VIDEOS, stepCards, trustStrip, comboCard } from '../components.js';

/** Combos shown as the four feature cards (the rest go in the grid below them). */
const FEATURED_COMBOS = ['combo-dia-noche', 'combo-calma-24', 'combo-trio', 'combo-full'];

export function homePage(cat) {
  const patches = cat.patches();
  const bloom = cat.bloom();
  const sleep = cat.products.sleep;
  const combos = cat.combos();
  const featured = FEATURED_COMBOS.map((k) => cat.products[k]).filter((c) => c && !cat.isSoldOut(c.key));
  const others = combos.filter((c) => !featured.includes(c));
  const dayCount = patches.filter((p) => p.key !== 'sleep').length;
  const sleepSold = cat.isSoldOut('sleep');
  const bloomSold = cat.isSoldOut('bloom');

  const hero = `
<section class="ph-hero">
  <div class="container">
    <div>
      <span class="eyebrow dot">Parches de bienestar · Costa Rica</span>
      <h1>Bienestar en un parche, <em>de la mañana a la noche.</em></h1>
      <p class="lead">${dayCount} fórmulas para tu día, Sleeping Patch para tu ritual nocturno y Bloom para tu piel. Sin pastillas: pegalo y seguí con tu día.</p>
      <div class="acts"><a class="btn btn-cta btn-lg" href="#tienda">Ver los parches</a><a class="text-link" href="${sleep.path}">Conocer Sleeping Patch</a></div>
      <div class="facts"><span><b>30 parches</b>por paquete</span><span><b>${formatCRC(sleep.price)}</b>cada fórmula</span><span><b>${esc(SITE.deliveryDays.replace(' hábiles', ''))}</b>a todo el país</span></div>
    </div>
    <div class="stage">
      <img src="/images/hero-lineup-1100.webp" srcset="/images/hero-lineup-700.webp 700w, /images/hero-lineup-1100.webp 1100w, /images/hero-lineup-1600.webp 1600w" sizes="(min-width: 960px) 620px, 92vw" alt="Los siete parches PatchHouse: Focus, Sleeping, Energy, NAD+, Dopamine, GLP-1 y Stress Relief" width="1600" height="1059" fetchpriority="high">
      <a class="stage-note" href="${sleep.path}"><img src="/images/sleep-thumb.webp" alt="" width="46" height="46"><span><small>Nuevo</small><b>Sleeping Patch · 30 noches</b></span></a>
    </div>
  </div>
</section>`;

  const moments = `
<section class="section" aria-label="Tres momentos">
  <div class="container">
    <div class="section-head split"><div><span class="eyebrow">Tres momentos</span><h2>Elegí tu <em>momento.</em></h2></div><p>Una sola casa para tu día, tu noche y tu piel. Todo en el mismo carrito y el mismo envío.</p></div>
    <div class="moments">
      <a class="moment" href="#tienda"><img src="/images/vid1-poster.webp" alt="" width="540" height="960" loading="lazy" style="object-position:50% 30%"><div class="txt"><div><small>Día</small><h3>${dayCount} fórmulas</h3><p>Focus, Energy, GLP-1 y más · ${formatCRC(sleep.price)}</p></div><span class="go" aria-hidden="true">→</span></div></a>
      <a class="moment" href="${sleep.path}"><img src="/images/sleep-ritual-poster.webp" alt="" width="540" height="960" loading="lazy" style="object-position:50% 40%"><div class="txt"><div><small>Noche · nuevo</small><h3>Sleeping Patch</h3><p>30 noches · ${formatCRC(sleep.price)}</p></div><span class="go" aria-hidden="true">→</span></div></a>
      <a class="moment" href="${bloom.path}"><img src="/images/bloom-empaque-poster.webp" alt="" width="540" height="960" loading="lazy" style="object-position:50% 45%"><div class="txt"><div><small>Piel · nuevo</small><h3>Bloom</h3><p>9 parches · desde ${formatCRC(BLOOM_PRICE)}</p></div><span class="go" aria-hidden="true">→</span></div></a>
    </div>
  </div>
</section>`;

  const grid = `
<section class="section" id="tienda" style="padding-top:0">
  <div class="container">
    <div class="section-head split"><div><span class="eyebrow">La colección</span><h2>Todos los parches</h2></div><p>Cada paquete trae 30 parches, un mes completo, a ${formatCRC(sleep.price)}. Bloom trae 9 parches por paquete.</p></div>
    <div class="grid cols-4">${[...patches, bloom].map((p) => productCard(p, cat)).join('')}</div>
  </div>
</section>`;

  const ingr = PATCHES.sleep.ingredients.map(([n]) => { const m = n.match(/^(.*?)\s([\d,]+\s*mg)$/); return m ? `<div><b>${m[2]}</b><span>${esc(m[1])}</span></div>` : ''; }).join('');
  const night = `
<section class="section" style="padding-top:0" aria-label="Sleeping Patch">
  <div class="container"><div class="panel panel-night"><div class="panel-in">
    <div>
      <span class="eyebrow">Nuevo · Colección de noche</span>
      <h2>Tu ritual nocturno, <em>en un parche.</em></h2>
      <p class="lead">Melatonina, magnesio, lúpulo y valeriana en un parche que se pega antes de dormir. Sin pastillas: pegalo, apagá la luz y descansá.</p>
      <div class="ingr">${ingr}</div>
      <div class="panel-buy"><span class="p">${formatCRC(sleep.price)}<small>30 parches · 30 noches</small></span>${sleepSold ? '' : `<button class="btn btn-gold btn-lg" type="button" data-add="sleep" data-qty="1">Agregar Sleeping Patch</button>`}<a class="text-link" href="${sleep.path}">Ver detalles</a></div>
    </div>
    ${reel(VIDEOS['sleep-ritual'], { line: true, cls: 'reel panel-video' })}
  </div></div></div>
</section>`;

  const videos = `
<section class="section" style="padding-top:0" aria-label="Videos">
  <div class="container">
    <div class="section-head split"><div><span class="eyebrow">En la vida real</span><h2>Miralo <em>en uso.</em></h2></div><p>Videos reales de PatchHouse, Sleeping Patch y Bloom. Tocá el ícono para escuchar.</p></div>
    ${reels(['vid1', 'sleep-mesita', 'bloom-perfil', 'vid5', 'sleep-aplicar', 'bloom-resena', 'vid6', 'bloom-despegar', 'vid4'], { line: true })}
  </div>
</section>`;

  const skin = `
<section class="section" style="padding-top:0" aria-label="Bloom">
  <div class="container"><div class="panel panel-skin"><div class="panel-in">
    <div class="ph"><img src="/images/bloom-gallery.webp" alt="Lámina de 9 parches Bloom" width="1000" height="1000" loading="lazy" decoding="async"></div>
    <div class="copy" data-bloom-picker>
      <span class="eyebrow">Nuevo · Bloom para tu piel</span>
      <h2>Para ese granito <em>de último minuto.</em></h2>
      <p class="lead">Parches transparentes de micro-agujas disolubles con ácido hialurónico. Se usan de noche: lavá, aplicá y dormí.</p>
      ${bloomSold ? `<p class="soldout-note">${esc(cat.config.soldOutMessage)}</p>` : `
      <fieldset class="bopts"><legend class="sr-only">Cantidad de Bloom</legend>
        <label class="bopt"><input type="radio" name="bloom-home" value="1"><i class="r" aria-hidden="true"></i><span><b>1 paquete</b><small>9 parches</small></span><span class="p">${formatCRC(BLOOM_PRICE)}</span></label>
        <label class="bopt on"><input type="radio" name="bloom-home" value="2" checked><i class="r" aria-hidden="true"></i><span><b>2 paquetes</b><small>18 parches · ${formatCRC(Math.round(BLOOM_PAIR_PRICE / 18))} por parche</small></span><span class="p">${formatCRC(BLOOM_PAIR_PRICE)}<em>Ahorrás ${formatCRC(BLOOM_PRICE * 2 - BLOOM_PAIR_PRICE)}</em></span></label>
      </fieldset>
      <button class="btn btn-plum btn-lg" type="button" data-add="bloom" data-qty="2" data-bloom-add>Agregar Bloom · <span data-bloom-price>${formatCRC(BLOOM_PAIR_PRICE)}</span></button>`}
      <p class="facts">Transparente · Micro-agujas disolubles · Viaja en el mismo envío que tus parches · <a class="text-link" href="${bloom.path}">Ver detalles</a></p>
    </div>
  </div></div></div>
</section>`;

  const combosHtml = `
<section class="section" id="combos" style="padding-top:0">
  <div class="container">
    <div class="section-head split"><div><span class="eyebrow">Combos</span><h2>Combiná <em>y ahorrá.</em></h2></div><p>Sleeping Patch entra a los combos como cualquier otro parche, también al Full House.</p></div>
    <div class="combos">${featured.map((c) => comboCard(c, cat, { feature: c.key === 'combo-full' })).join('')}</div>
    ${others.length ? `<div class="combos combos-more">${others.map((c) => comboCard(c, cat)).join('')}</div>` : ''}
  </div>
</section>`;

  const main = `
${hero}
${trustStrip()}
${moments}
${grid}
${night}
${videos}
${skin}
${combosHtml}

<section class="section quiz-section" id="quiz" style="padding-top:0">
  <div class="container">
    <div class="quiz" data-quiz>
      <div class="quiz-intro">
        <span class="eyebrow">Quiz de 30 segundos</span>
        <h2>¿Cuál parche es para mí?</h2>
        <p>Respondé 3 preguntas y te recomendamos la fórmula o el combo que mejor se adapta a tu día (y a tu noche).</p>
        <div class="quiz-progress" aria-hidden="true"><i data-quiz-bar></i></div>
      </div>
      <div class="quiz-stage" data-quiz-stage aria-live="polite">
        <noscript><p>Mirá todos los parches en la <a href="#tienda">tienda</a>.</p></noscript>
      </div>
    </div>
  </div>
</section>

<section class="section" id="como-funciona" style="padding-top:0">
  <div class="container">
    <div class="section-head split"><div><span class="eyebrow">Cómo funciona</span><h2>Tres pasos, <em>cero complicaciones.</em></h2></div><p>Los parches transdérmicos se aplican sobre la piel y liberan sus ingredientes de forma gradual, sin pasar por el sistema digestivo.</p></div>
    ${stepCards(COMMON_USAGE)}
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="container">
    <div class="info-banner">
      <div><h3>Envíos a todo Costa Rica</h3><p>Correos de Costa Rica o mensajería privada, entrega en ${SITE.deliveryDays}. <b>Envío gratis en pedidos de ${formatCRC(FREE_SHIPPING_FROM)} o más</b>; si no, ${formatCRC(SHIPPING_COST)}. Bloom viaja en el mismo envío que tus parches.</p></div>
      <ul class="info-list"><li>Retiro en ${SITE.pickup}</li><li>Pagá con SINPE Móvil o tarjeta</li><li>Cobertura nacional</li></ul>
    </div>
  </div>
</section>

<section class="section" id="faq" style="padding-top:0">
  <div class="container">
    <div class="section-head center"><span class="eyebrow">Preguntas</span><h2>Preguntas frecuentes</h2></div>
    ${faqList(FAQ)}
  </div>
</section>`;

  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'Organization', name: SITE.name, url: SITE.url, logo: `${SITE.url}/images/logo.png`, sameAs: [SITE.instagram] },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: SITE.url, inLanguage: 'es-CR' },
    faqJsonLd(FAQ)
  ];

  return layout({
    title: 'PatchHouse.CR – Parches de bienestar para tu día, tu noche y tu piel',
    description: 'Parches transdérmicos de bienestar, Sleeping Patch para tu noche y Bloom para tu piel. Sin pastillas. Pagá con SINPE Móvil o tarjeta. Envíos a todo Costa Rica.',
    path: '/',
    image: '/images/glp1-og.jpg',
    main,
    page: 'home',
    jsonld,
    head: '<link rel="preload" as="image" type="image/webp" href="/images/hero-lineup-1100.webp" imagesrcset="/images/hero-lineup-700.webp 700w, /images/hero-lineup-1100.webp 1100w, /images/hero-lineup-1600.webp 1600w" imagesizes="(min-width: 960px) 620px, 92vw" fetchpriority="high">'
  });
}
