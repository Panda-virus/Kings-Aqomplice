import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '../public/icons');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#F2F2F2"/>
  <text x="256" y="300" font-family="Georgia, serif" font-size="200" font-weight="600" fill="#5C0601" text-anchor="middle">K</text>
</svg>
`;

mkdirSync(iconsDir, { recursive: true });

await sharp(Buffer.from(svg))
  .resize(192, 192)
  .png()
  .toFile(join(iconsDir, 'icon-192.png'));

await sharp(Buffer.from(svg))
  .resize(512, 512)
  .png()
  .toFile(join(iconsDir, 'icon-512.png'));

console.log('Icons generated.');
