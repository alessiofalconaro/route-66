// One-time script: rasterizes the SVG app icon into the PNG sizes a PWA needs.
// Run with: npm run icons  (the PNGs are then committed to git).
import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/icons/icon.svg', import.meta.url));
mkdirSync(new URL('../public/icons', import.meta.url), { recursive: true });

const out = (name) => new URL(`../public/icons/${name}`, import.meta.url).pathname;

await sharp(svg).resize(192, 192).png().toFile(out('icon-192.png'));
await sharp(svg).resize(512, 512).png().toFile(out('icon-512.png'));
// The "maskable" icon gets extra padding so Android can crop it into a circle.
await sharp(svg)
  .resize(410, 410)
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#b91c1c' })
  .png()
  .toFile(out('icon-maskable-512.png'));

console.log('Icons generated in public/icons/');
