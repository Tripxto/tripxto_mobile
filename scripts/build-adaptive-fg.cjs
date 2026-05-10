/**
 * Builds tripxto-brand-fg.png from tripxto-brand.png (chroma-key blue → transparent).
 *   npm run build:fg
 */
const fs = require('fs');
const path = require('path');

const BR = 0x11;
const BG = 0x55;
const BB = 0xcc;
const THRESH = 88;

async function main() {
  const { Jimp } = require('jimp');
  const srcPath = path.join(__dirname, '..', 'assets', 'tripxto-brand.png');
  const outPath = path.join(__dirname, '..', 'assets', 'tripxto-brand-fg.png');
  if (!fs.existsSync(srcPath)) {
    console.error('Missing', srcPath);
    process.exit(1);
  }

  const img = await Jimp.read(srcPath);
  if (img.bitmap.width !== 1024 || img.bitmap.height !== 1024) {
    img.resize({ w: 1024, h: 1024 });
  }

  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const dist = Math.hypot(r - BR, g - BG, b - BB);
    if (dist < THRESH) {
      this.bitmap.data[idx + 3] = 0;
    }
  });

  await img.write(outPath);
  console.log('Wrote', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
