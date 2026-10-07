/**
 * Shared page shell (head, header, footer, cart drawer) + small HTML helpers.
 * Pure string templates: executed by scripts/build-pages.js, never shipped to the browser.
 */
import { SITE, FAQ, FREE_SHIPPING_FROM, formatCRC } from '../../shared/catalog.js';

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const RAINBOW = [
  ['p', '#e74c3c'], ['a', '#e67e22'], ['t', '#d4a90a'], ['c', '#27ae60'], ['h', '#2980b9'],
  [' ', ''], ['h', '#2980b9'], ['o', '#e67e22'], ['u', '#8e44ad'], ['s', '#d4a90a'], ['e', '#d4a90a']
];

/** Footer variant uses lighter yellows for contrast on dark. */
export function wordmark(onDark = false) {
  const letters = RAINBOW.map(([ch, color]) => (ch === ' ' ? ' ' : `<span style="color:${onDark && color === '#d4a90a' ? '#f1c40f' : color}">${ch}</span>`)).join('');
  return `<span class="wordmark" role="img" aria-label="patch house">${letters}</span>`;
}

export const icons = {
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 7h12l-1 12H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  pulse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l2.5-6 5 12L17 12h4"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path class="on" d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.78a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45c6.56 0 11.89-5.34 11.89-11.9 0-3.18-1.24-6.17-3.48-8.41z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/></svg>'
};

const NAV = [
  ['/#tienda', 'Tienda'],
  ['/#combos', 'Combos'],
  ['/#quiz', '¿Cuál es para mí?'],
  ['/#como-funciona', 'Cómo funciona'],
  ['/#faq', 'Preguntas']
];

// Meta Pixel. The stub, init and PageView run immediately (queued); fbevents.js (~260 KB, ~250 ms of
// phone CPU) loads on the first interaction (tap, key, scroll), 3.5 s after load, right away on
// conversion pages (`now`), or as soon as a conversion event is tracked (window.phLoadPixel, see
// src/js/lib/ui.js). The ad click id (?fbclid=) is saved to the _fbc cookie right away, so a visitor
// who clicks on before the script loads keeps their attribution (CAPI reads it too).
// Local/dev hosts get a no-op fbq so test orders never reach the real pixel.
const pixelScript = (now = false) => `<script>
(function(w,d){var h=location.hostname;
if(h==='localhost'||h==='[::1]'||/^127\\./.test(h)||/\\.(local|localhost|test)$/.test(h)){w.fbq=function(){if(w.console)console.debug('[pixel:dev]',[].slice.call(arguments))};return}
try{var id=new URLSearchParams(location.search).get('fbclid');if(id&&/^[A-Za-z0-9_-]{10,500}$/.test(id)){var m=d.cookie.match(/(?:^|; )_fbc=fb\\.\\d\\.\\d+\\.([^;]+)/);if(!m||m[1]!==id){var dom=h.replace(/^www\\./,'');d.cookie='_fbc=fb.1.'+Date.now()+'.'+id+';path=/;max-age=7776000;SameSite=Lax'+(/\\./.test(dom)?';domain=.'+dom:'')}}}catch(e){}
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[]}(w,d);
fbq('init','${SITE.pixelId}');fbq('track','PageView');
var E=['pointerdown','keydown','touchstart'];
function l(){if(w._fbqLoaded)return;w._fbqLoaded=true;E.forEach(function(e){removeEventListener(e,l,true)});removeEventListener('scroll',sc);var s=d.createElement('script');s.async=true;s.src='https://connect.facebook.net/en_US/fbevents.js';d.head.appendChild(s)}
function sc(){if(w.scrollY>0)l()}
w.phLoadPixel=l;
${now ? 'l();' : `E.forEach(function(e){addEventListener(e,l,{capture:true,passive:true,once:true})});addEventListener('scroll',sc,{passive:true});
function idle(){setTimeout(function(){if('requestIdleCallback' in w)requestIdleCallback(l,{timeout:2000});else l()},3500)}
if(d.readyState==='complete')idle();else addEventListener('load',idle);`}})(window,document);
</script>`;

export function header(current = '') {
  const links = NAV.map(([href, label]) => `<a href="${href}">${label}</a>`).join('');
  return `
<div class="ann" role="note"><strong>Envío gratis</strong> desde ${formatCRC(FREE_SHIPPING_FROM)} · SINPE Móvil o tarjeta</div>
<header class="site-header">
  <div class="container bar">
    <button class="icon-btn menu-toggle" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="primary-nav" data-menu-toggle>${icons.menu}</button>
    <a class="logo" href="/" aria-label="PatchHouse, inicio">${wordmark()}</a>
    <nav id="primary-nav" class="primary-nav" aria-label="Principal">${links}</nav>
    <button class="icon-btn cart-btn" type="button" aria-label="Abrir carrito" data-open-cart>${icons.cart}<span class="cart-count" data-cart-count hidden>0</span></button>
  </div>
</header>`;
}

export function footer() {
  return `
<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <a href="/" aria-label="PatchHouse, inicio">${wordmark(true)}</a>
        <p>Parches transdérmicos naturales para tu mente, energía y bienestar diario. Hechos para el día a día en Costa Rica.</p>
      </div>
      <div>
        <h4>Tienda</h4>
        <ul>
          <li><a href="/#tienda">Todos los parches</a></li>
          <li><a href="/#combos">Combos</a></li>
          <li><a href="/#como-funciona">Cómo funciona</a></li>
          <li><a href="/#faq">Preguntas frecuentes</a></li>
        </ul>
      </div>
      <div>
        <h4>Ayuda</h4>
        <ul>
          <li><a href="/envios-y-devoluciones/">Envíos y devoluciones</a></li>
          <li><a href="/terminos/">Términos y condiciones</a></li>
          <li><a href="/privacidad/">Privacidad</a></li>
          <li><a href="https://wa.me/${SITE.whatsapp}" rel="noopener" target="_blank">WhatsApp ${SITE.whatsappDisplay}</a></li>
          <li><a href="${SITE.instagram}" rel="noopener" target="_blank">Instagram @patchhouse.cr</a></li>
        </ul>
      </div>
      <div>
        <h4>Pagos</h4>
        <div class="pay-badges"><span>SINPE Móvil</span><span>Tarjeta crédito</span><span>Tarjeta débito</span></div>
      </div>
    </div>
    <p class="disclaimer">Los productos PatchHouse son suplementos de bienestar y no sustituyen el consejo ni el tratamiento de un profesional de la salud. Los resultados pueden variar de una persona a otra. Consultá con tu médico si tenés una condición médica, estás embarazada o en lactancia.</p>
    <div class="footer-bottom"><span>&copy; ${new Date().getFullYear()} PatchHouse.CR</span><span>Costa Rica</span></div>
  </div>
</footer>`;
}

export function cartShell() {
  return `
<div class="overlay" data-overlay></div>
<aside class="drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" aria-hidden="true">
  <div class="drawer-head">
    <h2 id="cart-title">Tu carrito</h2>
    <button class="icon-btn" type="button" aria-label="Cerrar carrito" data-close-cart>${icons.close}</button>
  </div>
  <div class="drawer-body" data-cart-body></div>
  <div class="drawer-foot" data-cart-foot hidden></div>
</aside>
<a class="wa-float" href="https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent('Hola PatchHouse, tengo una consulta')}" target="_blank" rel="noopener" aria-label="Escribinos por WhatsApp">${icons.whatsapp}</a>
<div class="toast-region" role="status" aria-live="polite" data-toasts></div>`;
}

/**
 * @param {object} o
 * @param {string} o.title      Full <title>
 * @param {string} o.description
 * @param {string} o.path       Canonical path, e.g. "/producto/focus-patch/"
 * @param {string} o.main       Inner HTML of <main>
 * @param {string} o.page       JS entry name in src/js (home|pdp|checkout|confirm|static)
 * @param {string[]} [o.css]    Extra stylesheets (beyond site.css)
 * @param {string} [o.image]    Absolute-path image for social cards
 * @param {object[]} [o.jsonld]
 * @param {boolean} [o.noindex]
 * @param {string} [o.bodyClass]
 * @param {string} [o.head]     Extra head HTML
 * @param {string} [o.tail]     Extra HTML after <main> (e.g. sticky bar)
 * @param {boolean} [o.pixelNow] Load the Meta script immediately (conversion pages)
 */
export function layout(o) {
  const url = `${SITE.url}${o.path}`;
  const image = `${SITE.url}${o.image || '/images/focus-og.jpg'}`;
  const css = ['/src/styles/site.css', ...(o.css || [])].map((href) => `<link rel="stylesheet" href="${href}">`).join('\n  ');
  const ld = (o.jsonld || []).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n  ');
  return `<!DOCTYPE html>
<!-- GENERATED by scripts/build-pages.js — edit src/templates/*, not this file. -->
<html lang="es-CR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(o.title)}</title>
  <meta name="description" content="${esc(o.description)}">
  <link rel="canonical" href="${url}">
  <meta name="robots" content="${o.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}">
  <meta name="theme-color" content="#1a1a2e">
  <meta property="og:type" content="${o.ogType || 'website'}">
  <meta property="og:site_name" content="${SITE.name}">
  <meta property="og:locale" content="es_CR">
  <meta property="og:title" content="${esc(o.title)}">
  <meta property="og:description" content="${esc(o.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${image}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32.png">
  <link rel="icon" type="image/png" sizes="48x48" href="/images/favicon-48.png">
  <link rel="apple-touch-icon" href="/images/apple-touch-icon.png">
  <link rel="preload" href="/fonts/plus-jakarta-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="dns-prefetch" href="https://connect.facebook.net">
  ${o.head || ''}
  ${css}
  ${ld}
</head>
<body class="${o.bodyClass || ''}">
  <noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=${SITE.pixelId}&ev=PageView&noscript=1"></noscript>
  <a class="skip-link" href="#main">Saltar al contenido</a>
  ${header()}
  <main id="main">${o.main}</main>
  ${o.tail || ''}
  ${footer()}
  ${cartShell()}
  ${pixelScript(o.pixelNow)}
  <script type="module" src="/src/js/${o.page}.js"></script>
</body>
</html>
`;
}

/** Accessible FAQ list (native <details>, no JS needed). */
export function faqList(items = FAQ, openFirst = true) {
  return `<div class="faq">${items.map(([q, a], i) => `<details${openFirst && i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><div class="answer"><p>${esc(a)}</p></div></details>`).join('')}</div>`;
}

export function faqJsonLd(items = FAQ) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } }))
  };
}
