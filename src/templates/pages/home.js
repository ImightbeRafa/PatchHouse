import { SITE, FAQ, COMMON_USAGE, formatCRC, SHIPPING_COST } from '../../../shared/catalog.js';
import { layout, esc, faqList, faqJsonLd } from '../layout.js';
import { productCard, productImage, reels, benefitCards, stepCards, trustStrip } from '../components.js';

export function homePage(cat) {
  const patches = cat.patches();
  const combos = cat.combos();
  const lowest = Math.min(...patches.map((p) => p.price));

  const hero = `
<section class="hero">
  <div class="hero-orbs" aria-hidden="true"><i class="o1"></i><i class="o2"></i><i class="o3"></i></div>
  <div class="container hero-inner">
    <div class="hero-visual">
      <div class="hero-ring" aria-hidden="true"></div>
      <img class="hero-packs" src="/images/hero-packs.webp" alt="Los seis parches PatchHouse: Focus, Stress Relief, GLP-1, Energy, Dopamine y NAD+" width="1500" height="716" fetchpriority="high" decoding="async">
      <span class="float-chip c1"><b>30</b> parches · 1 mes</span>
      <span class="float-chip c2">Desde <b>${formatCRC(lowest)}</b></span>
      <span class="float-chip c3">Pagá con <b>SINPE Móvil</b></span>
    </div>
    <div class="hero-copy">
      <span class="hero-badge">100% natural · Hecho para Costa Rica</span>
      <h1>Tu bienestar diario en un <span class="gradient-text">parche</span></h1>
      <p class="hero-sub">Suplementos de bienestar con ingredientes de origen natural que se aplican sobre la piel. Sin pastillas, sin complicaciones: pegalo y seguí con tu día.</p>
      <div class="hero-actions">
        <a class="btn btn-cta btn-lg" href="#tienda">Ver los parches</a>
        <a class="btn btn-ghost btn-lg" href="#combos">Combos con ahorro</a>
      </div>
      <ul class="hero-points"><li>Envío a todo el país</li><li>SINPE Móvil o tarjeta</li><li>Atención por WhatsApp</li></ul>
      <div class="hero-pills" aria-label="Fórmulas">${patches.map((p) => `<a href="${p.path}" style="--c:${p.accent}">${esc(p.short)}</a>`).join('')}</div>
    </div>
  </div>
</section>`;

  const main = `
${hero}
${trustStrip()}

<section class="section" id="tienda">
  <div class="container">
    <div class="section-head"><span class="eyebrow">Nuestros parches</span><h2>Una fórmula para cada momento</h2><p>Cada paquete trae 30 parches: un mes completo de rutina desde ${formatCRC(lowest)}.</p></div>
    <div class="grid">${patches.map((p) => productCard(p, cat)).join('')}</div>
  </div>
</section>

<section class="section alt" aria-label="PatchHouse en uso">
  <div class="container">
    <div class="section-head"><span class="eyebrow">En uso</span><h2>Pequeños momentos, rutina sencilla</h2><p>Parches pensados para acompañarte sin interrumpir tu día.</p></div>
    ${reels()}
  </div>
</section>

<section class="section" id="como-funciona">
  <div class="container">
    <div class="section-head center"><span class="eyebrow">Cómo funciona</span><h2>Tres pasos, cero complicaciones</h2></div>
    ${stepCards(COMMON_USAGE)}
  </div>
</section>

<section class="section alt" id="combos">
  <div class="container">
    <div class="section-head"><span class="eyebrow">Combos</span><h2>Combiná y ahorrá</h2><p>Elegí los parches que mejor se adapten a tu estilo de vida y pagá menos por cada uno.</p></div>
    <div class="grid">${combos.map((p) => productCard(p, cat)).join('')}</div>
  </div>
</section>

<section class="section">
  <div class="container explainer">
    <div class="section-head" style="margin:0">
      <span class="eyebrow">Parches de bienestar</span>
      <h2>¿Qué son y por qué funcionan?</h2>
      <p>Los parches transdérmicos se aplican sobre la piel y están diseñados para liberar sus ingredientes de forma gradual, sin pasar por el sistema digestivo. Son prácticos, discretos y fáciles de integrar a tu rutina.</p>
      <div><a class="btn btn-outline" href="#tienda">Elegir mi parche</a></div>
    </div>
    <img src="/images/queson-detail.webp" alt="Infografía: qué son los parches de bienestar" width="1120" height="705" loading="lazy" decoding="async">
  </div>
</section>

<section class="section alt">
  <div class="container">
    <div class="section-head center"><span class="eyebrow">Por qué parches</span><h2>Ventajas transdérmicas</h2></div>
    ${benefitCards()}
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="info-banner">
      <div><h3>Envíos a todo Costa Rica</h3><p>Correos de Costa Rica o mensajería privada. Envío fijo de ${formatCRC(SHIPPING_COST)} y entrega en ${SITE.deliveryDays}.</p></div>
      <ul class="info-list"><li>Retiro en ${SITE.pickup}</li><li>Pagá con SINPE Móvil o tarjeta</li><li>Cobertura nacional</li></ul>
    </div>
  </div>
</section>

<section class="section alt" id="faq">
  <div class="container">
    <div class="section-head center"><span class="eyebrow">FAQ</span><h2>Preguntas frecuentes</h2></div>
    ${faqList(FAQ)}
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="cta-final">
      <h2>Empezá hoy tu rutina de bienestar</h2>
      <p>Elegí tu parche, pagá con SINPE Móvil o tarjeta y recibilo en todo el país.</p>
      <a class="btn btn-cta btn-lg" href="#tienda">Ver los parches</a>
    </div>
  </div>
</section>`;

  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'Organization', name: SITE.name, url: SITE.url, logo: `${SITE.url}/images/logo.png`, sameAs: [SITE.instagram] },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: SITE.url, inLanguage: 'es-CR' },
    faqJsonLd(FAQ)
  ];

  return layout({
    title: 'PatchHouse.CR – Parches transdérmicos naturales en Costa Rica',
    description: 'Parches transdérmicos naturales para tu mente, energía y bienestar diario. Sin pastillas. Pagá con SINPE Móvil o tarjeta. Envíos a todo Costa Rica.',
    path: '/',
    image: '/images/glp1-og.jpg',
    main,
    page: 'home',
    jsonld,
    head: '<link rel="preload" as="image" type="image/webp" href="/images/hero-packs.webp" fetchpriority="high">'
  });
}
