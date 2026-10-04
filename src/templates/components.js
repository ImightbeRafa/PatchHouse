/** Reusable HTML fragments for the generated pages. */
import { formatCRC, SITE } from '../../shared/catalog.js';
import { esc, icons } from './layout.js';

/** Image path helpers: every product has square thumb/card/gallery webp files. */
export const productImage = (p, size = 'card') => `/images/${p.image}-${size}.webp`;

export function priceBlock(p, { unit = true } = {}) {
  const compare = p.kind === 'combo' && p.compareAt > p.price ? `<s>${formatCRC(p.compareAt)}</s><em>Ahorrás ${formatCRC(p.savings)}</em>` : '';
  return `<div class="price"><b>${formatCRC(p.price)}</b>${compare}${unit && p.unitLabel ? `<small>${esc(p.unitLabel)}</small>` : ''}</div>`;
}

/** Card for a single patch or a combo. `cat` is the built catalog. */
export function productCard(p, cat) {
  const sold = cat.isSoldOut(p.key);
  const isCombo = p.kind === 'combo';
  const media = `<img src="/images/${p.cardImage || p.image}-card.webp" alt="${esc(p.name)}" width="520" height="520" loading="lazy" decoding="async">`;
  const tagline = isCombo ? p.includes.map((k) => cat.products[k].short).join(' + ') : p.tagline;
  const chips = isCombo
    ? `<div class="combo-chips" aria-hidden="true">${p.includes.map((k) => `<img src="${productImage(cat.products[k], 'thumb')}" alt="" width="40" height="40" loading="lazy" decoding="async">`).join('')}</div>`
    : '';
  const tag = sold ? '<span class="tag">Agotado</span>' : p.badge ? `<span class="tag${isCombo ? ' save' : ''}">${esc(p.badge)}</span>` : '';
  return `
<article class="card${sold ? ' is-soldout' : ''}" data-product="${p.key}">
  <div class="card-media">${tag}${media}</div>
  <div class="card-body">
    <h3><a href="${p.path}">${esc(p.name)}</a></h3>
    ${chips}
    <p class="card-tagline">${esc(tagline)}</p>
    <div class="card-foot">
      ${priceBlock(p, { unit: false })}
      ${sold
        ? `<p class="soldout-note">${esc(cat.config.soldOutMessage)}</p>`
        : `<button class="btn btn-cta btn-sm" type="button" data-add="${p.key}" data-qty="1">Agregar al carrito</button>`}
    </div>
  </div>
</article>`;
}

export const REELS = [
  { src: '/images/vid1.mp4', poster: '/images/vid1-poster.webp', title: 'Aplicalo en segundos', sub: 'Así de fácil se pega' },
  { src: '/images/vidsar.mp4', poster: '/images/vidsar-poster.webp', title: 'Discreto durante el día', sub: 'Va debajo de la ropa' },
  { src: '/images/vid3.mp4', poster: '/images/vid3-poster.webp', title: 'Bienestar sin complicarlo', sub: 'Tu rutina, sin pastillas' }
];

/** Vertical (9:16) videos: poster only until visible, muted autoplay, tap speaker for sound. */
export function reels() {
  return `<div class="reels" data-reels>${REELS.map((r, i) => `
  <figure class="reel">
    <video muted loop playsinline preload="none" poster="${r.poster}" data-src="${r.src}" aria-label="${esc(r.title)}"></video>
    <button class="sound" type="button" aria-label="Activar sonido" aria-pressed="false" data-sound>${icons.sound}</button>
    <figcaption>${esc(r.title)}<br><span style="font-weight:500;opacity:.85">${esc(r.sub)}</span></figcaption>
  </figure>`).join('')}</div>`;
}

export const BENEFITS = [
  { icon: 'clock', title: 'Liberación gradual', text: 'Diseñados para liberar sus ingredientes poco a poco durante el día.' },
  { icon: 'pulse', title: 'Sin pasar por el sistema digestivo', text: 'Se aplican sobre la piel: una opción para quienes prefieren evitar las pastillas.' },
  { icon: 'shield', title: 'Una rutina simple', text: 'Un parche al día. Cada paquete trae 30, un mes completo.' },
  { icon: 'heart', title: 'Cómodo y discreto', text: 'Pegalo debajo de la ropa y seguí con tu día.' },
  { icon: 'leaf', title: '100% vegano', text: 'Fórmulas elaboradas sin ingredientes de origen animal.' },
  { icon: 'check', title: 'Libre de crueldad animal', text: 'No se realizan pruebas en animales en ninguna etapa del proceso.' }
];

export function benefitCards(items = BENEFITS) {
  return `<div class="benefits">${items.map((b) => `
  <div class="benefit"><div class="ico">${icons[b.icon]}</div><div><h3>${esc(b.title)}</h3><p>${esc(b.text)}</p></div></div>`).join('')}</div>`;
}

export function stepCards(steps) {
  return `<div class="steps">${steps.map((s) => `<div class="step"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`).join('')}</div>`;
}

export function trustStrip() {
  const items = [
    ['truck', 'Envío a todo el país', `₡3.000 fijo · ${SITE.deliveryDays}`],
    ['lock', 'Pagá como prefieras', 'SINPE Móvil o tarjeta'],
    ['leaf', '100% vegano', 'Libre de crueldad animal'],
    ['chat', 'Atención por WhatsApp', SITE.whatsappDisplay]
  ];
  return `<section class="trust-strip" aria-label="Garantías de compra"><div class="container"><ul>${items.map(([i, b, s]) => `<li>${icons[i]}<div><b>${b}</b><span>${s}</span></div></li>`).join('')}</ul></div></section>`;
}
