import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.resolve(__dirname, '../public/images');

const PRODUCT_IMAGES = [
  'focus.jpg',
  'nad.jpg',
  'energy.jpg',
  'glp1.jpg',
  'dopamine.jpg',
  'stressdown.jpg'
];

const VARIANTS = {
  thumb: { width: 120, quality: 78 },
  hero: { width: 560, quality: 80 },
  detail: { width: 800, quality: 82 }
};

const VIDEO_FILES = ['vid1.mp4', 'vidsar.mp4', 'vid3.mp4'];

async function fileSizeKb(filePath) {
  const stat = await fs.stat(filePath);
  return Math.round(stat.size / 1024);
}

async function generateVariant(inputPath, outputPath, { width, quality }) {
  await sharp(inputPath)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, effort: 4 })
    .toFile(outputPath);
}

async function optimizeProductImages() {
  for (const filename of PRODUCT_IMAGES) {
    const inputPath = path.join(imagesDir, filename);
    const base = path.parse(filename).name;

    for (const [variant, config] of Object.entries(VARIANTS)) {
      const outputPath = path.join(imagesDir, `${base}-${variant}.webp`);
      await generateVariant(inputPath, outputPath, config);
      const kb = await fileSizeKb(outputPath);
      console.log(`  ${base}-${variant}.webp → ${kb} KB`);
    }
  }
}

async function optimizeQueson() {
  const inputPath = path.join(imagesDir, 'queson.jpeg');
  const outputs = [
    { name: 'queson-detail.webp', width: 1120, quality: 82 },
    { name: 'queson-hero.webp', width: 800, quality: 80 }
  ];

  for (const { name, width, quality } of outputs) {
    const outputPath = path.join(imagesDir, name);
    await generateVariant(inputPath, outputPath, { width, quality });
    const kb = await fileSizeKb(outputPath);
    console.log(`  ${name} → ${kb} KB`);
  }
}

async function ffmpegAvailable() {
  try {
    await execFileAsync('ffmpeg', ['-version']);
    return true;
  } catch {
    return false;
  }
}

async function generateVideoPosters(hasFfmpeg) {
  for (const video of VIDEO_FILES) {
    const base = path.parse(video).name;
    const inputPath = path.join(imagesDir, video);
    const outputPath = path.join(imagesDir, `${base}-poster.webp`);

    if (hasFfmpeg) {
      const tmpFrame = path.join(imagesDir, `${base}-frame.jpg`);
      try {
        await execFileAsync('ffmpeg', [
          '-y', '-i', inputPath,
          '-vframes', '1',
          '-q:v', '4',
          tmpFrame
        ], { timeout: 30000 });

        await sharp(tmpFrame)
          .resize({ width: 560, withoutEnlargement: true })
          .webp({ quality: 75 })
          .toFile(outputPath);

        await fs.unlink(tmpFrame).catch(() => {});
        const kb = await fileSizeKb(outputPath);
        console.log(`  ${base}-poster.webp → ${kb} KB (ffmpeg)`);
      } catch (err) {
        console.warn(`  ${base}-poster: ffmpeg failed (${err.message}), using placeholder`);
        await createPlaceholderPoster(outputPath);
      }
    } else {
      await createPlaceholderPoster(outputPath);
    }
  }
}

async function createPlaceholderPoster(outputPath) {
  await sharp({
    create: {
      width: 560,
      height: 360,
      channels: 3,
      background: { r: 238, g: 238, b: 236 }
    }
  })
    .webp({ quality: 60 })
    .toFile(outputPath);
  const kb = await fileSizeKb(outputPath);
  console.log(`  ${path.basename(outputPath)} → ${kb} KB (placeholder)`);
}

async function main() {
  console.log('Optimizing product images...');
  await optimizeProductImages();

  console.log('Optimizing queson.jpeg...');
  await optimizeQueson();

  console.log('Generating video posters...');
  const hasFfmpeg = await ffmpegAvailable();
  if (!hasFfmpeg) console.warn('ffmpeg not found — using placeholder posters');
  await generateVideoPosters(hasFfmpeg);

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
