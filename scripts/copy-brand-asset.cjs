/**
 * Copy your TripXto artwork into assets/tripxto-brand.png for Expo icon + splash.
 *
 *   npm run setup:brand -- "C:\path\to\your-image.png"
 *
 * Or drop the PNG into tripxto-mobile/assets/ and rename it to tripxto-brand.png manually.
 */
const fs = require('fs');
const path = require('path');

const src = process.argv[2] || process.env.TRIPXTO_BRAND_SRC;
const dest = path.join(__dirname, '..', 'assets', 'tripxto-brand.png');

if (!src) {
  console.error('Usage: npm run setup:brand -- "<full-path-to.png>"');
  process.exit(1);
}
if (!fs.existsSync(src)) {
  console.error('Source not found:', src);
  process.exit(1);
}
fs.copyFileSync(src, dest);
console.log('OK →', dest);
console.log('Tip: npm run build:fg  → tripxto-brand-fg.png (transparent) for round Android icon');
