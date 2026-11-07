/** Reusable HTML fragments for the generated pages. */
import { formatCRC, SITE, FREE_SHIPPING_FROM, BLOOM_PAIR_PRICE } from '../../shared/catalog.js';
import { esc, icons } from './layout.js';

/** Image path helpers: every product has square thumb/card/gallery webp files. */
export const productImage = (p, size = 'card') => `/images/${p.image}-${size}.webp`;

export function priceBlock(p, { unit = true } = {}) {
  const compare = p.kind === 'combo' && p.compareAt > p.price ? `<s>${formatCRC(p.compareAt)}</s><em>Ahorrás ${formatCRC(p.savings)}</em>` : '';
  return `<div class="price"><b>${formatCRC(p.price)}</b>${compare}${unit && p.unitLabel ? `<small>${esc(p.unitLabel)}</small>` : ''}</div>`;
}

/** "o ahorrá hasta ₡X en combo" under a single patch's price (combos that include it and are in stock). */
function comboHint(p, cat) {
  if (p.kind !== 'patch' || cat.isSoldOut(p.key)) return '';
  const best = cat.combos().filter((c) => c.includes.includes(p.key) && !cat.isSoldOut(c.key)).sort((a, b) => b.savings - a.savings)[0];
  if (!best || !best.savings) return '';
  return `<a class="combo-hint" href="${p.path}#pack">o ahorrá hasta <b>${formatCRC(best.savings)}</b> en combo →</a>`;
}

/** Card for a single patch, Bloom or a combo. `cat` is the built catalog. */
export function productCard(p, cat) {
  const sold = cat.isSoldOut(p.key);
  const isCombo = p.kind === 'combo';
  const img = `/images/${p.cardImage || p.image}`;
  const media = `<img src="${img}-card.webp" srcset="${img}-sm.webp 320w, ${img}-card.webp 520w" sizes="(min-width: 1000px) 300px, (min-width: 700px) 31vw, 46vw" alt="${esc(p.name)}" width="520" height="520" loading="lazy" decoding="async">`;
  const tagline = isCombo ? p.includes.map((k) => cat.products[k].short).join(' + ') : p.tagline;
  const chips = isCombo
    ? `<div class="combo-chips" aria-hidden="true">${p.includes.map((k) => `<img src="${productImage(cat.products[k], 'thumb')}" alt="" width="40" height="40" loading="lazy" decoding="async">`).join('')}</div>`
    : '';
  const tag = sold ? '<span class="tag">Agotado</span>' : p.badge ? `<span class="tag${isCombo ? ' save' : ''}">${esc(p.badge)}</span>` : '';
  const price = p.kind === 'bloom'
    ? `<div class="price"><b>${formatCRC(p.price)}</b><small class="pair">2 por ${formatCRC(BLOOM_PAIR_PRICE)}</small></div>`
    : priceBlock(p, { unit: false });
  return `
<article class="card${sold ? ' is-soldout' : ''}${p.theme ? ` theme-${p.theme}` : ''}" data-product="${p.key}">
  <div class="card-media">${tag}${media}</div>
  <div class="card-body">
    <h3><a href="${p.path}">${esc(p.kind === 'bloom' ? 'Bloom · granitos' : p.name)}</a></h3>
    ${chips}
    <p class="card-tagline">${esc(tagline)}</p>
    <div class="card-foot">
      ${price}
      ${comboHint(p, cat)}
      ${sold
        ? `<p class="soldout-note">${esc(cat.config.soldOutMessage)}</p>`
        : `<button class="btn btn-cta btn-sm" type="button" data-add="${p.key}" data-qty="1" aria-label="Agregar ${esc(p.name)} al carrito">Agregar</button>`}
    </div>
  </div>
</article>`;
}

/** Every vertical video in the store. Sleeping and Bloom clips come from their original stores. */
export const VIDEOS = {
  vid4: { src: '/images/vid4.mp4', poster: '/images/vid4-poster.webp', title: 'Una fórmula para cada momento', sub: 'Energy, Focus, GLP-1 y más', line: 'PatchHouse' },
  vid1: { src: '/images/vid1.mp4', poster: '/images/vid1-poster.webp', title: 'Aplicalo en segundos', sub: 'Así de fácil se pega', line: 'PatchHouse' },
  vid5: { src: '/images/vid5.mp4', poster: '/images/vid5-poster.webp', title: 'Entre el trabajo y el estrés', sub: 'Focus para tus horas de compu', line: 'PatchHouse' },
  vidsar: { src: '/images/vidsar.mp4', poster: '/images/vidsar-poster.webp', title: 'Discreto durante el día', sub: 'Va debajo de la ropa', line: 'PatchHouse' },
  vid6: { src: '/images/vid6.mp4', poster: '/images/vid6-poster.webp', title: 'Parte de mi rutina', sub: 'Energy para los días pesados', line: 'PatchHouse' },
  vid3: { src: '/images/vid3.mp4', poster: '/images/vid3-poster.webp', title: 'Bienestar sin complicarlo', sub: 'Tu rutina, sin pastillas', line: 'PatchHouse' },
  'sleep-ritual': { src: '/images/sleep-ritual.mp4', poster: '/images/sleep-ritual-poster.webp', title: 'Mi ritual de noche', sub: 'Sleeping Patch', line: 'Sleeping Patch' },
  'sleep-mesita': { src: '/images/sleep-mesita.mp4', poster: '/images/sleep-mesita-poster.webp', title: 'Antes de dormir', sub: 'Sleeping Patch', line: 'Sleeping Patch' },
  'sleep-aplicar': { src: '/images/sleep-aplicar.mp4', poster: '/images/sleep-aplicar-poster.webp', title: 'Así se aplica', sub: 'Sleeping Patch', line: 'Sleeping Patch' },
  'sleep-envio': { src: '/images/sleep-envio.mp4', poster: '/images/sleep-envio-poster.webp', title: 'Llegó mi pedido', sub: 'Sleeping Patch', line: 'Sleeping Patch' },
  'bloom-empaque': { src: '/images/bloom-empaque.mp4', poster: '/images/bloom-empaque-poster.webp', title: 'El paquete', sub: 'Bloom', line: 'Bloom' },
  'bloom-perfil': { src: '/images/bloom-perfil.mp4', poster: '/images/bloom-perfil-poster.webp', title: 'Un parche por granito', sub: 'Bloom', line: 'Bloom' },
  'bloom-resena': { src: '/images/bloom-resena.mp4', poster: '/images/bloom-resena-poster.webp', title: 'Mi experiencia', sub: 'Bloom', line: 'Bloom' },
  'bloom-frente': { src: '/images/bloom-frente.mp4', poster: '/images/bloom-frente-poster.webp', title: 'Antes de dormir', sub: 'Bloom', line: 'Bloom' },
  'bloom-lamina': { src: '/images/bloom-lamina.mp4', poster: '/images/bloom-lamina-poster.webp', title: 'La lámina de 9', sub: 'Bloom', line: 'Bloom' },
  'bloom-despegar': { src: '/images/bloom-despegar.mp4', poster: '/images/bloom-despegar-poster.webp', title: 'Así se despega', sub: 'Bloom', line: 'Bloom' }
};

/** The six original PatchHouse clips (patch and combo pages). */
export const PATCH_REELS = ['vid4', 'vid1', 'vid5', 'vidsar', 'vid6', 'vid3'];

/** One 9:16 video. core.js sets the poster when it gets near and loads the video only when visible. */
export function reel(r, { line = false, cls = 'reel' } = {}) {
  const caption = line ? `<small>${esc(r.line)}</small>${esc(r.title)}` : `${esc(r.title)}<br><span style="font-weight:500;opacity:.85">${esc(r.sub)}</span>`;
  return `
  <figure class="${cls}">
    <video muted loop playsinline preload="none" width="540" height="960"${cls !== 'reel' ? ` poster="${r.poster}"` : ''} data-poster="${r.poster}" data-src="${r.src}" aria-label="${esc(r.title)}"></video>
    <button class="sound" type="button" aria-label="Activar sonido" aria-pressed="false" data-sound>${icons.sound}</button>
    <figcaption>${caption}</figcaption>
  </figure>`;
}

/** Vertical video carousel. `keys` picks clips from VIDEOS; `line` labels each with its product line. */
export function reels(keys = PATCH_REELS, { line = false } = {}) {
  return `<div class="reels-wrap${keys.length <= 4 ? ' few' : ''}">
  <button class="reels-nav prev" type="button" aria-label="Videos anteriores" data-reels-prev>‹</button>
  <button class="reels-nav next" type="button" aria-label="Más videos" data-reels-next>›</button>
  <div class="reels" data-reels>${keys.map((k) => reel(VIDEOS[k], { line })).join('')}</div>
</div>`;
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
    ['truck', `Envío gratis desde ${formatCRC(FREE_SHIPPING_FROM)}`, `A todo el país · ${SITE.deliveryDays}`],
    ['lock', 'SINPE Móvil o tarjeta', 'Pago seguro con Tilopay'],
    ['leaf', 'Sin pastillas', 'Se aplica sobre la piel'],
    ['chat', 'Atención por WhatsApp', SITE.whatsappDisplay]
  ];
  return `<section class="trust-strip" aria-label="Garantías de compra"><div class="container"><ul>${items.map(([i, b, s]) => `<li>${icons[i]}<div><b>${b}</b><span>${s}</span></div></li>`).join('')}</ul></div></section>`;
}

/** Combo card with the real pack cut-outs (home page and cross-sell rows). */
export function comboCard(c, cat, { feature = false } = {}) {
  const many = c.includes.length > 3;
  const imgs = c.includes.map((k) => `<img src="/images/pack-${k}-cut.webp" alt="" height="360" loading="lazy" decoding="async">`).join('');
  const sold = cat.isSoldOut(c.key);
  const title = c.key === 'combo-full' ? `Full House · ${c.includes.length} paquetes` : c.short;
  return `
<article class="combo${feature ? ' feature' : ''}" data-product="${c.key}">
  <div class="media${many ? ' many' : ''}">${imgs}</div>
  <div class="body">
    ${c.badge === 'Nuevo' ? '<span class="new">Nuevo</span>' : ''}
    <h3><a href="${c.path}">${esc(title)}</a></h3>
    <p>${esc(c.includes.map((k) => cat.products[k].short).join(' + '))}</p>
    <div class="pr"><b>${formatCRC(c.price)}</b><s>${formatCRC(c.compareAt)}</s><em>Ahorrás ${formatCRC(c.savings)}${c.price >= FREE_SHIPPING_FROM ? ' · envío gratis' : ''}</em></div>
    ${sold ? `<p class="soldout-note">${esc(cat.config.soldOutMessage)}</p>` : `<button class="btn btn-cta btn-sm" type="button" data-add="${c.key}" data-qty="1">Agregar</button>`}
  </div>
</article>`;
}
