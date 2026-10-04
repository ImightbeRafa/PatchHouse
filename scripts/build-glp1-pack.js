/**
 * Builds a high-resolution SoloTree GLP-1 pack image (assets-src/glp1.jpg) from the real SoloTree
 * Focus pack photo, because the only GLP-1 pack image available is a low-resolution screenshot.
 *
 * Same SoloTree template, so: recolour the purple band to the GLP-1 pink, then overlay the GLP-1 texts
 * (title, subtitle, bullets, sticker ring) rendered by headless Chrome at 2x. Everything else (logo,
 * pouch, badges, "30 PATCHES", lighting) is the real photo.
 *
 * Run once (`node scripts/build-glp1-pack.js`), then `npm run images` and `npm run visuals`.
 * Replace with a real studio photo of the GLP-1 pack when the supplier provides one.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { PACK_BOUNDS } from './lib/cutout.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'assets-src');
const CHROME = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => p && fs.existsSync(p));
const S = 2; // render scale

/* ---------- 1. crop the Focus photo to the pack (with its real background) ---------- */
const [file, l, t, r, b] = PACK_BOUNDS.focus;
const meta = await sharp(path.join(SRC, file)).metadata();
const box = { left: Math.round(l * meta.width), top: Math.round(t * meta.height), width: Math.round((r - l) * meta.width), height: Math.round((b - t) * meta.height) };
const { data, info } = await sharp(path.join(SRC, file)).rotate().extract(box).resize({ height: 1080 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;

/* ---------- 2. recolour purple → GLP-1 pink (hue shift, keep shading) ---------- */
function rgb2hsl(r0, g0, b0) {
  const r1 = r0 / 255; const g1 = g0 / 255; const b1 = b0 / 255;
  const max = Math.max(r1, g1, b1); const min = Math.min(r1, g1, b1);
  let h = 0; let s = 0; const lum = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = lum > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r1) h = (g1 - b1) / d + (g1 < b1 ? 6 : 0);
    else if (max === g1) h = (b1 - r1) / d + 2;
    else h = (r1 - g1) / d + 4;
    h *= 60;
  }
  return [h, s, lum];
}
function hsl2rgb(h, s, lum) {
  const c = (1 - Math.abs(2 * lum - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lum - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r1, g1, b1].map((v) => Math.round((v + m) * 255));
}
const out = Buffer.from(data);
for (let i = 0; i < W * H; i++) {
  const [h, s, lum] = rgb2hsl(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
  if (h >= 245 && h <= 325 && s > 0.1) {
    const nl = lum + (1 - lum) * 0.42;          // purple is darker than the GLP-1 pink
    const ns = Math.min(1, s * 1.35 + 0.15);
    const [nr, ng, nb] = hsl2rgb(352, ns, Math.min(0.86, nl));
    out[i * 3] = nr; out[i * 3 + 1] = ng; out[i * 3 + 2] = nb;
  }
}

/** Median colour of a region, ignoring pixels outside [minL, maxL] luminance (text). */
function sample(x0, y0, x1, y1, minL, maxL) {
  const px = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * 3;
    const L = 0.299 * out[i] + 0.587 * out[i + 1] + 0.114 * out[i + 2];
    if (L >= minL && L <= maxL) px.push([out[i], out[i + 1], out[i + 2], L]);
  }
  px.sort((a, c) => a[3] - c[3]);
  const m = px[Math.floor(px.length / 2)] || [255, 255, 255];
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}
const pouch = sample(110, 330, 600, 610, 200, 256);     // white pouch behind the title
const strip = sample(10, 668, 110, 702, 150, 256);      // light strip above the band
const band = sample(110, 730, 460, 860, 60, 215);       // band behind the bullets
const sticker = sample(470, 640, 560, 700, 60, 215);    // sticker ring background

/** Inpaint a rectangle by interpolating each row between the pixels just outside it (keeps gradients). */
function inpaintRows(x0, y0, x1, y1) {
  for (let y = y0; y < y1; y++) {
    const a = (y * W + (x0 - 1)) * 3;
    const c = (y * W + (x1 + 1)) * 3;
    for (let x = x0; x <= x1; x++) {
      const k = (x - x0) / (x1 - x0);
      const i = (y * W + x) * 3;
      for (let ch = 0; ch < 3; ch++) out[i + ch] = Math.round(out[a + ch] * (1 - k) + out[c + ch] * k);
    }
  }
}
/** Same, interpolating each column between the rows just above and below. */
function inpaintCols(x0, y0, x1, y1) {
  for (let x = x0; x <= x1; x++) {
    const a = ((y0 - 1) * W + x) * 3;
    const c = ((y1 + 1) * W + x) * 3;
    for (let y = y0; y <= y1; y++) {
      const k = (y - y0) / (y1 - y0);
      const i = (y * W + x) * 3;
      for (let ch = 0; ch < 3; ch++) out[i + ch] = Math.round(out[a + ch] * (1 - k) + out[c + ch] * k);
    }
  }
}
/**
 * 2-D inpaint (transfinite / Coons patch): matches all four edges so lighting gradients blend both ways.
 * Edge colours are averaged over a band outside the box (ignoring dark text pixels) and smoothed along
 * the edge, so JPEG noise or a stray letter on the boundary cannot tint the fill.
 */
function inpaint2D(x0, y0, x1, y1, keep = (l) => l >= 150, band = 6, smooth = 10) {
  const src = Buffer.from(out);
  const lum = (i) => 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
  const edgeSample = (coords) => {
    const acc = [0, 0, 0]; let n = 0;
    for (const [x, y] of coords) {
      const i = (y * W + x) * 3;
      if (!keep(lum(i))) continue;
      acc[0] += src[i]; acc[1] += src[i + 1]; acc[2] += src[i + 2]; n++;
    }
    return n ? acc.map((v) => v / n) : null;
  };
  const series = (len, fn) => {
    const raw = Array.from({ length: len }, (_, k) => fn(k));
    for (let k = 0; k < len; k++) if (!raw[k]) raw[k] = raw[k - 1] || raw.find(Boolean);
    return raw.map((_, k) => {
      const acc = [0, 0, 0]; let n = 0;
      for (let j = Math.max(0, k - smooth); j <= Math.min(len - 1, k + smooth); j++) { acc[0] += raw[j][0]; acc[1] += raw[j][1]; acc[2] += raw[j][2]; n++; }
      return acc.map((v) => v / n);
    });
  };
  const H1 = y1 - y0 + 1; const W1 = x1 - x0 + 1;
  const Lc = series(H1, (k) => edgeSample(Array.from({ length: band }, (_, d) => [x0 - 1 - d, y0 + k])));
  const Rc = series(H1, (k) => edgeSample(Array.from({ length: band }, (_, d) => [x1 + 1 + d, y0 + k])));
  const Tc = series(W1, (k) => edgeSample(Array.from({ length: band }, (_, d) => [x0 + k, y0 - 1 - d])));
  const Bc = series(W1, (k) => edgeSample(Array.from({ length: band }, (_, d) => [x0 + k, y1 + 1 + d])));
  const TL = Tc[0]; const TR = Tc[W1 - 1]; const BL = Bc[0]; const BR = Bc[W1 - 1];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const u = (x - x0) / (x1 - x0); const v = (y - y0) / (y1 - y0);
    const L = Lc[y - y0]; const R = Rc[y - y0]; const T = Tc[x - x0]; const B = Bc[x - x0];
    const i = (y * W + x) * 3;
    for (let ch = 0; ch < 3; ch++) {
      const val = (1 - u) * L[ch] + u * R[ch] + (1 - v) * T[ch] + v * B[ch]
        - ((1 - u) * (1 - v) * TL[ch] + u * (1 - v) * TR[ch] + (1 - u) * v * BL[ch] + u * v * BR[ch]);
      out[i + ch] = Math.max(0, Math.min(255, Math.round(val)));
    }
  }
}
/** Extend the (smoothed) row above the box downwards; pixels inside the sticker circle are left untouched. */
function fillFromAbove(x0, y0, x1, y1, scx, scy, sr) {
  const src = Buffer.from(out);
  const col = [];
  for (let x = x0; x <= x1; x++) {
    const acc = [0, 0, 0]; let n = 0;
    for (let dx = -8; dx <= 8; dx++) for (let d = 1; d <= 5; d++) {
      const i = ((y0 - d) * W + Math.min(W - 1, Math.max(0, x + dx))) * 3;
      const L = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
      if (L < 150) continue;
      acc[0] += src[i]; acc[1] += src[i + 1]; acc[2] += src[i + 2]; n++;
    }
    col.push(acc.map((v) => v / Math.max(1, n)));
  }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (Math.hypot(x - scx, y - scy) < sr) continue;
    const i = (y * W + x) * 3;
    const c = col[x - x0];
    out[i] = Math.round(c[0]); out[i + 1] = Math.round(c[1]); out[i + 2] = Math.round(c[2]);
  }
}
/** Flat-fill the sticker ring (outside the peeled corner) with its own background colour. */
function fillRing(cx0, cy0, r0, r1, skipFrom, skipTo, rgb) {
  for (let y = cy0 - r1; y <= cy0 + r1; y++) for (let x = cx0 - r1; x <= cx0 + r1; x++) {
    const d = Math.hypot(x - cx0, y - cy0);
    if (d < r0 || d > r1) continue;
    let ang = Math.atan2(y - cy0, x - cx0) * 180 / Math.PI; if (ang < 0) ang += 360;
    if (ang > skipFrom && ang < skipTo) continue;
    const i = (y * W + x) * 3;
    out[i] = rgb[0]; out[i + 1] = rgb[1]; out[i + 2] = rgb[2];
  }
}
const stickerRgb = sticker.match(/\d+/g).map(Number);
inpaint2D(100, 316, 632, 566);    // old title (kept clear of the sticker)
fillFromAbove(100, 567, 610, 640, 600, 730, 134);  // old subtitle line, around the sticker
inpaintRows(102, 670, 438, 704);   // old strip text
inpaint2D(104, 726, 458, 850, (l) => l <= 215);    // old bullets (skip white text)
fillRing(600, 730, 93, 133, 18, 92, stickerRgb);

const recoloured = path.join(os.tmpdir(), 'glp1-recolour.png');
await sharp(out, { raw: { width: W, height: H, channels: 3 } }).resize(W * S, H * S, { kernel: 'lanczos3' }).png().toFile(recoloured);

/* ---------- 3. text overlay (Chrome, 2x) ---------- */
const font = pathToFileURL(path.join(root, 'public/fonts/plus-jakarta-sans-latin.woff2')).href;
const px = (v) => `${v * S}px`;
const cx = 600; const cy = 730; const rOut = 131; const rIn = 94; const rText = 112;
const arcStart = 96; const arcEnd = 376; // degrees, clockwise from +x; skips the peeled corner (20°–100°)
const pt = (deg, rad) => [cx + rad * Math.cos(deg * Math.PI / 180), cy + rad * Math.sin(deg * Math.PI / 180)];
const [ax, ay] = pt(arcStart, rText); const [bx, by] = pt(arcEnd, rText);
const [o1x, o1y] = pt(arcStart, rOut); const [o2x, o2y] = pt(arcEnd, rOut);
const [i1x, i1y] = pt(arcStart, rIn); const [i2x, i2y] = pt(arcEnd, rIn);

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=block" rel="stylesheet">
<style>
@font-face{font-family:PJS;src:url('${font}') format('woff2');font-weight:200 800}
*{margin:0;box-sizing:border-box}
body{width:${W * S}px;height:${H * S}px;position:relative;overflow:hidden;background:url('${pathToFileURL(recoloured).href}') 0 0/100% 100% no-repeat;font-family:Poppins,PJS,Arial,sans-serif}
.cover{position:absolute;filter:blur(${3 * S}px)}
.t{position:absolute;color:#111;white-space:nowrap}
</style></head><body>
<div class="t" style="left:${px(116)};top:${px(318)};font-size:${px(132)};font-weight:700;letter-spacing:-${px(2)};line-height:1">GLP-1</div>
<div class="t" style="left:${px(116)};top:${px(444)};font-size:${px(132)};font-weight:700;letter-spacing:-${px(2)};line-height:1">Patches</div>
<div class="t" style="left:${px(120)};top:${px(574)};font-size:${px(31)};font-weight:500;color:#2b2b2b">Innovative Weight Management Aid*</div>
<div class="t" style="left:${px(122)};top:${px(738)};font-size:${px(20.5)};font-weight:400;color:#fff;line-height:1.55">• Helps Support GLP-1 Levels*<br>• Assists in Appetite Regulation*<br>• Supports Metabolism Function*</div>
<svg style="position:absolute;left:0;top:0" width="${W * S}" height="${H * S}" viewBox="0 0 ${W} ${H}">
  <defs><path id="arc" d="M ${ax} ${ay} A ${rText} ${rText} 0 1 1 ${bx} ${by}"/>
  <filter id="soft"><feGaussianBlur stdDeviation="1.2"/></filter></defs>
  <text font-family="Poppins,PJS,Arial" font-weight="500" font-size="26" fill="#fff" letter-spacing="2.5"><textPath href="#arc" startOffset="50%" text-anchor="middle">GLP-1 PATCH · GLP-1 PATCH</textPath></text>
</svg>
</body></html>`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'glp1-pack-'));
const htmlFile = path.join(tmp, 'pack.html');
const png = path.join(tmp, 'pack.png');
fs.writeFileSync(htmlFile, html);
execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${W * S},${H * S}`, '--virtual-time-budget=8000', `--screenshot=${png}`, pathToFileURL(htmlFile).href], { stdio: 'ignore', timeout: 90000 });

/* ---------- 4. place it on a studio background like the other SoloTree photos (3:4, 1792x2400) ---------- */
const packH = Math.round((b - t) * 2400);
const packW = Math.round((r - l) * 1792);
const packImg = await sharp(png).resize(packW, packH, { kernel: 'lanczos3' }).toBuffer();
const bg = await sharp(path.join(SRC, file)).rotate().resize(1792, 2400).toBuffer();
await sharp(bg).composite([{ input: packImg, left: Math.round(l * 1792), top: Math.round(t * 2400) }]).jpeg({ quality: 93, mozjpeg: true }).toFile(path.join(SRC, 'glp1.jpg'));
fs.copyFileSync(png, path.join(SRC, 'glp1-pack-render.png'));
fs.rmSync(tmp, { recursive: true, force: true });
console.log('assets-src/glp1.jpg written (SoloTree GLP-1, built from the Focus template)');
