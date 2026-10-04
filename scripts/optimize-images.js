/**
 * Image pipeline (manual step: `npm run images`).
 *
 * Reads originals from /assets-src and writes web-ready files to /public/images.
 * The generated files are committed, so `vite build` never needs sharp/ffmpeg.
 *
 * Per product: square crops (the PDP gallery and cards are 1:1)
 *   {name}-thumb.webp    160px  (cart rows, combo chips)
 *   {name}-card.webp     520px  (product cards)
 *   {name}-gallery.webp 1000px  (PDP main image)
 *   {name}-og.jpg       1000px  (social previews)
 * Videos are re-encoded for the web and posters come from a real frame
 * (needs ffmpeg; set FFMPEG_PATH if it is not on PATH). Originals live in assets-src/video.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '../assets-src');
const outDir = path.resolve(__dirname, '../public/images');
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

const PRODUCTS = [
  ['focus', 'focus.jpg'],
  ['nad', 'nad.jpg'],
  ['energy', 'energy.jpg'],
  ['glp1', 'glp1.jpg'],
  ['dopamine', 'dopamine.jpg'],
  ['stress', 'stressdown.jpg']
];

const SQUARES = [
  { suffix: 'thumb', size: 160, quality: 78 },
  { suffix: 'card', size: 520, quality: 80 },
  { suffix: 'gallery', size: 1000, quality: 82 }
];

/** [name, source file in assets-src/video]. The .mov originals are large and gitignored. */
const VIDEOS = [['vid1', 'vid1.mp4'], ['vidsar', 'vidsar.mp4'], ['vid3', 'vid3.mp4'], ['vid4', 'vid4.mov'], ['vid5', 'vid5.mov'], ['vid6', 'vid6.mov']];

const kb = async (file) => Math.round((await fs.stat(file)).size / 1024);

async function products() {
  for (const [name, file] of PRODUCTS) {
    const input = path.join(srcDir, file);
    for (const { suffix, size, quality } of SQUARES) {
      const out = path.join(outDir, `${name}-${suffix}.webp`);
      await sharp(input).rotate().resize(size, size, { fit: 'cover', position: 'centre' }).webp({ quality, effort: 5 }).toFile(out);
      console.log(`  ${name}-${suffix}.webp  ${await kb(out)} KB`);
    }
    const og = path.join(outDir, `${name}-og.jpg`);
    await sharp(input).rotate().resize(1000, 1000, { fit: 'cover', position: 'centre' }).jpeg({ quality: 82, mozjpeg: true }).toFile(og);
    console.log(`  ${name}-og.jpg  ${await kb(og)} KB`);
  }
}

async function explainer() {
  const input = path.join(srcDir, 'queson.jpeg');
  for (const [name, width, quality] of [['queson-detail.webp', 1120, 82], ['queson-hero.webp', 800, 80]]) {
    const out = path.join(outDir, name);
    await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality, effort: 5 }).toFile(out);
    console.log(`  ${name}  ${await kb(out)} KB`);
  }
}

async function videos() {
  for (const [name, file] of VIDEOS) {
    const input = path.join(srcDir, 'video', file);
    const out = path.join(outDir, `${name}.mp4`);
    try {
      await execFileAsync(FFMPEG, [
        '-y', '-loglevel', 'error', '-i', input,
        '-vf', 'scale=540:-2:flags=lanczos,fps=30',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-profile:v', 'main', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '64k', '-ac', '1', out
      ], { timeout: 300000 });
      console.log(`  ${name}.mp4  ${await kb(out)} KB`);
    } catch (err) {
      console.warn(`  ${name}.mp4: ffmpeg unavailable (${err.code || err.message}); kept existing file`);
    }
  }
}

async function posters() {
  for (const [name, file] of VIDEOS) {
    const input = path.join(srcDir, 'video', file);
    const frame = path.join(outDir, `${name}-frame.jpg`);
    const out = path.join(outDir, `${name}-poster.webp`);
    try {
      await execFileAsync(FFMPEG, ['-y', '-ss', '1', '-i', input, '-vframes', '1', '-q:v', '3', frame], { timeout: 60000 });
      await sharp(frame).resize({ width: 540, withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
      await fs.unlink(frame).catch(() => {});
      console.log(`  ${name}-poster.webp  ${await kb(out)} KB`);
    } catch (err) {
      // Never overwrite an existing real poster with a blank one.
      console.warn(`  ${name}-poster: ffmpeg unavailable (${err.code || err.message}); kept existing file`);
    }
  }
}

console.log('Product images...');
await products();
console.log('Explainer...');
await explainer();
console.log('Videos (540x960, faststart)...');
await videos();
console.log('Video posters...');
await posters();
console.log('Done.');
