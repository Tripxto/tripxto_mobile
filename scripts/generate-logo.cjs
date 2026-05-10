/**
 * Clean TripXto icons (no grid):
 *   tripxto-brand.png    — opaque square (iOS icon, splash, favicon)
 *   tripxto-brand-fg.png — transparent + white wordmark (Android adaptive → round/circle mask)
 *
 *   npm run generate:logo
 *   npm run generate:logo:force
 */
const fs = require('fs');
const path = require('path');

const W = 1024;
const H = 1024;
const BRAND = 0x1155ccff;
const TRANSPARENT = 0x00000000;

const force = process.argv.includes('--force');

function font128White() {
  return path.join(
    __dirname,
    '..',
    'node_modules',
    '@jimp',
    'plugin-print',
    'fonts',
    'open-sans',
    'open-sans-128-white',
    'open-sans-128-white.fnt',
  );
}

async function main() {
  const { Jimp, loadFont, HorizontalAlign, VerticalAlign } = require('jimp');
  const fnt = font128White();
  if (!fs.existsSync(fnt)) {
    console.error('Missing font file:', fnt);
    process.exit(1);
  }
  const font = await loadFont(fnt);

  const outMain = path.join(__dirname, '..', 'assets', 'tripxto-brand.png');
  const outFg = path.join(__dirname, '..', 'assets', 'tripxto-brand-fg.png');

  if (!force && fs.existsSync(outMain) && fs.existsSync(outFg)) {
    console.log('Skip (use --force to replace)');
    return;
  }

  const main = new Jimp({ width: W, height: H, color: BRAND });
  await main.print({
    font,
    x: 0,
    y: 0,
    text: {
      text: 'TripXto',
      alignmentX: HorizontalAlign.CENTER,
      alignmentY: VerticalAlign.MIDDLE,
    },
    maxWidth: W,
    maxHeight: H,
  });
  await main.write(outMain);
  console.log('Wrote', outMain);

  const fg = new Jimp({ width: W, height: H, color: TRANSPARENT });
  await fg.print({
    font,
    x: 0,
    y: 0,
    text: {
      text: 'TripXto',
      alignmentX: HorizontalAlign.CENTER,
      alignmentY: VerticalAlign.MIDDLE,
    },
    maxWidth: Math.floor(W * 0.7),
    maxHeight: Math.floor(H * 0.45),
  });
  await fg.write(outFg);
  console.log('Wrote', outFg);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
