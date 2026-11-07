/**
 * Web images for the Sleeping Patch and Bloom lines (manual step, part of `npm run images`).
 *
 * Sources (real photos and renders from the original sleep.shopping and bloomcr.shopping stores):
 *   assets-src/sleep/pack-night.png     Sleeping Patches bag on its night backdrop (card + gallery)
 *   assets-src/sleep/*.jpg              lifestyle stills (wrist, bedside table, sleeping…)
 *   assets-src/sleep/hero.webp          bedroom scene used in "Cómo se usa"
 *   assets-src/bloom/pack.jpg           sheet of 9 Bloom patches on a pedestal
 *   assets-src/bloom/patch.jpg          a single Bloom patch
 * Video posters: public/images/{sleep,bloom}-*.mp4 are already web-encoded (540 px, faststart);
 * their posters are real frames saved next to them as *-poster.jpg and converted here to webp.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'assets-src');
const OUT = path.join(root, 'public/images');

const SQUARES = [['thumb', 160, 78], ['sm', 320, 78], ['card', 520, 80], ['gallery', 1000, 82]];

async function squares(name, input, { og = false, position = 'centre' } = {}) {
  for (const [suffix, size, quality] of SQUARES) {
    await sharp(input).rotate().resize(size, size, { fit: 'cover', position }).webp({ quality, effort: 5 }).toFile(path.join(OUT, `${name}-${suffix}.webp`));
  }
  if (og) await sharp(input).rotate().resize(1000, 1000, { fit: 'cover', position }).flatten({ background: '#0a1730' }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT, `${name}-og.jpg`));
  console.log(`  ${name}`);
}

console.log('Sleeping Patch...');
await squares('sleep', path.join(SRC, 'sleep/pack-night.png'), { og: true });
for (const still of ['muneca-aplicar', 'mesita', 'dormir', 'bolsa-luz', 'despegar', 'hoja']) {
  await squares(`sleep-${still}`, path.join(SRC, `sleep/${still}.jpg`));
}
for (const w of [700, 1100]) {
  await sharp(path.join(SRC, 'sleep/hero.webp')).resize({ width: w }).webp({ quality: 80, effort: 5 }).toFile(path.join(OUT, `sleep-hero-${w}.webp`));
}
console.log('  sleep-hero');

console.log('Bloom...');
await squares('bloom', path.join(SRC, 'bloom/pack.jpg'), { og: true });
await squares('bloom-patch', path.join(SRC, 'bloom/patch.jpg'));

console.log('Video posters...');
for (const file of await fs.readdir(OUT)) {
  if (!/^(sleep|bloom)-.+-poster\.jpg$/.test(file)) continue;
  const out = file.replace(/\.jpg$/, '.webp');
  await sharp(path.join(OUT, file)).resize({ width: 540, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(OUT, out));
  await fs.unlink(path.join(OUT, file));
  console.log(`  ${out}`);
}
console.log('Done.');
