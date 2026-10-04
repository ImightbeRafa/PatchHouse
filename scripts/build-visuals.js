/**
 * Marketing visuals generated from the REAL product photos (manual step: `npm run visuals`).
 *
 *   {patch}-studio-{thumb,card,gallery}.webp   pack on its own colour backdrop (cards, gallery)
 *   {patch}-info.webp                          "¿Qué son los parches?" infographic in the pack colours
 *   {combo}-{thumb,card,gallery}.webp + -og.jpg  composed combo shots (packs fanned on a mixed backdrop)
 *   hero-packs.webp                            all packs fanned, transparent (home hero)
 *
 * Nothing is AI-invented: every pack pixel comes from assets-src/*.jpg (cut out by scripts/lib/cutout.js).
 * The infographic is rendered with headless Chrome/Edge (set CHROME_PATH if needed).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { cutout } from './lib/cutout.js';
import { PATCHES, PATCH_ORDER, buildCatalog, readConfig } from '../shared/catalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'assets-src');
const OUT = path.join(root, 'public/images');
const CHROME = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => p && fs.existsSync(p));

/** Pack colours sampled from the real packaging. ink = readable text colour on `c`. */
export const PACK_COLORS = {
  focus: { c: '#7b3f98', ink: '#ffffff', deep: '#4f2266' },
  nad: { c: '#6aae3d', ink: '#ffffff', deep: '#3d6e1d' },
  energy: { c: '#ecc914', ink: '#4a1210', deep: '#7a1f1f' },
  glp1: { c: '#e58a9c', ink: '#3a1119', deep: '#b04a62' },
  dopamine: { c: '#e9c31d', ink: '#3b3000', deep: '#8a6d00' },
  stress: { c: '#18917e', ink: '#ffffff', deep: '#0d5c50' }
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (h, w, t) => { const a = hex(h); const b = hex(w); return `rgb(${a.map((v, i) => Math.round(v * (1 - t) + b[i] * t)).join(',')})`; };
const tint = (h, t) => mix(h, '#ffffff', t);

const packCache = new Map();
async function pack(key, height) {
  if (!packCache.has(key)) packCache.set(key, await cutout(SRC, key, 1100));
  return sharp(packCache.get(key)).resize({ height }).png().toBuffer();
}

/** Rotated pack + its soft shadow, both as full-size layers positioned at (cx, cy) centre. */
async function layer(key, height, deg, cx, cy) {
  const base = await pack(key, height);
  const rotated = await sharp(base).rotate(deg, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const meta = await sharp(rotated).metadata();
  const alpha = await sharp(rotated).extractChannel(3).raw().toBuffer();
  const pad = 80;
  const shadow = await sharp({ create: { width: meta.width, height: meta.height, channels: 3, background: '#1a1a2e' } })
    .joinChannel(Buffer.from(alpha.map((a) => Math.round(a * 0.32))), { raw: { width: meta.width, height: meta.height, channels: 1 } })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .blur(26)
    .png()
    .toBuffer();
  const left = Math.round(cx - meta.width / 2);
  const top = Math.round(cy - meta.height / 2);
  return [
    { input: shadow, left: left - pad + Math.round(height * 0.02), top: top - pad + Math.round(height * 0.05) },
    { input: rotated, left, top }
  ];
}

/** Soft backdrop: gradient between colours + light glow + floating "patch" dots. */
function backdrop(size, colors, { dots = true } = {}) {
  const [a, b = a] = colors;
  const dotSvg = dots ? colors.concat(colors).slice(0, 5).map((c, i) => {
    const pos = [[0.12, 0.18, 0.06], [0.88, 0.14, 0.045], [0.9, 0.82, 0.07], [0.1, 0.86, 0.04], [0.5, 0.08, 0.03]][i];
    return `<circle cx="${pos[0] * size}" cy="${pos[1] * size}" r="${pos[2] * size}" fill="${tint(c, 0.25)}" opacity=".55"/><circle cx="${pos[0] * size}" cy="${pos[1] * size}" r="${pos[2] * size * 0.62}" fill="none" stroke="#fff" stroke-width="${size * 0.004}" stroke-dasharray="${size * 0.006} ${size * 0.012}" opacity=".7"/>`;
  }).join('') : '';
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tint(a, 0.72)}"/><stop offset="1" stop-color="${tint(b, 0.6)}"/></linearGradient>
      <radialGradient id="r" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#g)"/>
    <circle cx="${size / 2}" cy="${size * 0.55}" r="${size * 0.42}" fill="url(#r)"/>
    ${dotSvg}
    <ellipse cx="${size / 2}" cy="${size * 0.9}" rx="${size * 0.36}" ry="${size * 0.035}" fill="${mix(a, '#1a1a2e', 0.5)}" opacity=".08"/>
  </svg>`);
}

async function saveSquare(name, buffer, { og = true } = {}) {
  for (const [suffix, size, q] of [['thumb', 160, 80], ['card', 520, 82], ['gallery', 1000, 84]]) {
    await sharp(buffer).resize(size, size).webp({ quality: q, effort: 5 }).toFile(path.join(OUT, `${name}-${suffix}.webp`));
  }
  if (og) await sharp(buffer).resize(1000, 1000).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(OUT, `${name}-og.jpg`));
  console.log(`  ${name}`);
}

/** Pack positions for N packs on a 1000px canvas: [x, y, height, deg], back to front. */
function arrangement(n) {
  switch (n) {
    case 1: return [[500, 540, 640, 0]];
    case 2: return [[390, 540, 560, -7], [620, 560, 560, 7]];
    case 3: return [[290, 560, 480, -11], [710, 560, 480, 11], [500, 540, 560, 0]];
    case 4: return [[230, 580, 420, -14], [770, 580, 420, 14], [395, 545, 470, -5], [605, 545, 470, 5]];
    case 5: return [[150, 610, 350, -14], [850, 610, 350, 14], [315, 578, 390, -7], [685, 578, 390, 7], [500, 545, 430, 0]];
    default: return [[160, 610, 340, -18], [840, 610, 340, 18], [290, 575, 380, -11], [710, 575, 380, 11], [420, 545, 420, -4], [580, 545, 420, 4]];
  }
}

async function composition(keys, size = 1000, { transparent = false, dots = true } = {}) {
  const spots = arrangement(keys.length);
  // put the first key in front: arrangement lists back-to-front
  const order = keys.length >= 3 ? [...keys.slice(1), keys[0]] : keys;
  const layers = [];
  for (let i = 0; i < order.length; i++) {
    const [x, y, h, deg] = spots[i];
    layers.push(...await layer(order[i], Math.round(h * size / 1000), deg, x * size / 1000, y * size / 1000));
  }
  const base = transparent
    ? sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    : sharp(backdrop(size, keys.map((k) => PACK_COLORS[k].c), { dots }));
  return base.composite(layers).png().toBuffer();
}

/* ---------- infographic (HTML → Chrome screenshot) ---------- */
function infoHtml(key) {
  const p = PATCHES[key];
  const { c, ink, deep } = PACK_COLORS[key];
  const name = `${p.short.toUpperCase()} PATCH`;
  const vitamins = p.ingredients.map(([n]) => n.replace(/\s\d.*$/, '')).join(', ');
  const font = pathToFileURL(path.join(root, 'public/fonts/plus-jakarta-sans-latin.woff2')).href;
  const pill = (title, text) => `<div class="row"><div class="pill">${title}</div><p>${text}</p></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:PJS;src:url('${font}') format('woff2');font-weight:200 800}
  *{box-sizing:border-box;margin:0}
  body{width:1000px;height:1000px;font-family:PJS,Arial,sans-serif;background:linear-gradient(160deg,#ffffff 0%,${tint(c, 0.86)} 100%);color:#1a1a2e;overflow:hidden;position:relative}
  h1{position:absolute;left:60px;right:60px;top:56px;font-size:58px;line-height:1.02;font-weight:800;letter-spacing:-.02em;text-align:center}
  h1 span{color:${deep}}
  .art{position:absolute;left:30px;top:270px;width:470px;height:560px}
  .rows{position:absolute;right:56px;top:300px;width:430px;display:grid;gap:44px}
  .pill{display:inline-block;background:${c};color:${ink};font-weight:800;font-size:22px;letter-spacing:.04em;padding:12px 22px;border-radius:999px;text-transform:uppercase}
  p{margin-top:12px;font-size:22px;line-height:1.38;color:#3a3a4a;padding-left:6px}
  .foot{position:absolute;left:0;right:0;bottom:44px;text-align:center;font-size:20px;font-weight:700;color:${deep};letter-spacing:.06em}
  .brand{position:absolute;left:0;right:0;bottom:78px;text-align:center;font-size:30px;font-weight:800;letter-spacing:-.02em}
  </style></head><body>
  <h1>¿QUÉ SON LOS PARCHES <span>DE BIENESTAR?</span></h1>
  <svg class="art" viewBox="0 0 470 560" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <path id="ring" d="M235,150 m-118,0 a118,118 0 1,1 236,0 a118,118 0 1,1 -236,0"/>
      <linearGradient id="top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tint(c, 0.1)}"/><stop offset="1" stop-color="${mix(c, '#000000', 0.12)}"/></linearGradient>
      <filter id="sh"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#1a1a2e" flood-opacity=".18"/></filter>
    </defs>
    <!-- bottom layer: vitamins & extracts -->
    <g filter="url(#sh)"><ellipse cx="235" cy="440" rx="190" ry="78" fill="#f4ead8"/></g>
    ${Array.from({ length: 34 }, (_, i) => `<circle cx="${80 + ((i * 53) % 310)}" cy="${405 + ((i * 29) % 70)}" r="${3 + (i % 3)}" fill="${tint(c, 0.35 + (i % 4) * 0.12)}"/>`).join('')}
    <!-- middle layer: adhesive -->
    <g filter="url(#sh)"><ellipse cx="235" cy="320" rx="192" ry="80" fill="#ffffff" stroke="#e6e6ee" stroke-width="3"/></g>
    <ellipse cx="235" cy="320" rx="160" ry="62" fill="none" stroke="#eef0f4" stroke-width="10"/>
    <!-- top layer: printed patch -->
    <g filter="url(#sh)"><circle cx="235" cy="150" r="140" fill="url(#top)"/></g>
    <circle cx="235" cy="150" r="98" fill="none" stroke="#ffffff" stroke-opacity=".5" stroke-width="2"/>
    <text font-family="PJS,Arial" font-weight="800" font-size="24" fill="${ink}"><textPath href="#ring" textLength="728" lengthAdjust="spacing">${name} · ${name} · </textPath></text>
    <g transform="translate(235 150)" fill="${ink}">
      <path d="M0 -44 C 34 -30 38 12 0 40 C -38 12 -34 -30 0 -44Z" opacity=".95"/>
      <path d="M0 -30 L0 34 M0 -6 L-16 -18 M0 8 L16 -4 M0 20 L-14 10" stroke="${c}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    </g>
    <!-- curl showing it peels -->
    <path d="M330 232 q40 -10 52 -52 q-46 6 -52 52z" fill="#ffffff" opacity=".92"/>
    <!-- leader lines -->
    <g stroke="${c}" stroke-width="3" fill="${c}"><line x1="375" y1="120" x2="470" y2="70"/><circle cx="375" cy="120" r="6"/>
      <line x1="420" y1="320" x2="470" y2="300"/><circle cx="420" cy="320" r="6"/>
      <line x1="420" y1="450" x2="470" y2="520"/><circle cx="420" cy="450" r="6"/></g>
  </svg>
  <div class="rows">
    ${pill('Capa superior', 'Protege la fórmula. Su color identifica tu parche.')}
    ${pill('Adhesivo suave', 'Suave con la piel y se mantiene en su lugar durante el día.')}
    ${pill('Vitaminas y extractos', `${vitamins}: se liberan de forma gradual sobre la piel.`)}
  </div>
  <div class="brand">${p.name}</div>
  <div class="foot">30 PARCHES · UN MES DE RUTINA</div>
  </body></html>`;
}

async function infographic(key) {
  if (!CHROME) { console.warn('  (no Chrome/Edge found: infographics skipped)'); return; }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ph-info-'));
  const html = path.join(tmp, `${key}.html`);
  const png = path.join(tmp, `${key}.png`);
  fs.writeFileSync(html, infoHtml(key));
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1000,1000', '--virtual-time-budget=4000', `--screenshot=${png}`, pathToFileURL(html).href], { stdio: 'ignore', timeout: 60000 });
  await sharp(png).resize(1000, 1000).webp({ quality: 86, effort: 5 }).toFile(path.join(OUT, `${key}-info.webp`));
  await sharp(png).resize(160, 160).webp({ quality: 80 }).toFile(path.join(OUT, `${key}-info-thumb.webp`));
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`  ${key}-info`);
}

/** Every Full House variant the store can produce: all eligible patches, or one of them sold out. */
function fullHouseVariants() {
  const base = buildCatalog(readConfig({})).products['combo-full'].includes;
  const sets = [base, ...base.map((k) => base.filter((x) => x !== k))];
  const current = buildCatalog(readConfig(process.env)).products['combo-full'];
  if (current) sets.push(current.includes);
  return [...new Map(sets.filter((s) => s.length >= 2).map((s) => [s.join('-'), s])).values()];
}

console.log('Studio shots...');
for (const key of PATCH_ORDER) await saveSquare(`${key}-studio`, await composition([key]), { og: false });

console.log('Combos...');
const cat = buildCatalog(readConfig({}));
for (const c of cat.combos()) if (c.key !== 'combo-full') await saveSquare(c.key, await composition(c.includes));
for (const set of fullHouseVariants()) await saveSquare(`combo-full-${set.join('-')}`, await composition(set));

console.log('Hero...');
// Wide arc, back to front: outer pair, middle pair, inner pair.
const HERO = [['focus', 190, 520, 470, -14], ['nad', 1310, 520, 470, 14], ['stress', 440, 480, 540, -8], ['dopamine', 1060, 480, 540, 8], ['glp1', 640, 450, 600, -3], ['energy', 860, 450, 600, 3]];
const heroLayers = [];
for (const [k, x, y, h, deg] of HERO) heroLayers.push(...await layer(k, h, deg, x, y));
const hero = await sharp({ create: { width: 1500, height: 900, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(heroLayers).png().toBuffer();
await sharp(hero).trim({ threshold: 1 }).webp({ quality: 86, alphaQuality: 90, effort: 5 }).toFile(path.join(OUT, 'hero-packs.webp'));
console.log('  hero-packs');

console.log('Infographics...');
for (const key of PATCH_ORDER) await infographic(key);
console.log('Done.');
