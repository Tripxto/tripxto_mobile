/**
 * Copies the static marketing page into Expo `public/` so the web app iframe matches `project/index.html`.
 * Run from repo: node tripxto-mobile/scripts/sync-marketing.cjs
 * Or from tripxto-mobile: node scripts/sync-marketing.cjs
 */
const fs = require('fs');
const path = require('path');

const mobileRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(mobileRoot, '..');
const src = path.join(repoRoot, 'project', 'index.html');
const dst = path.join(mobileRoot, 'public', 'marketing.html');

if (!fs.existsSync(src)) {
  console.error('Missing:', src);
  process.exit(1);
}
fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.copyFileSync(src, dst);
let html = fs.readFileSync(dst, 'utf8');
if (!html.includes('<base href="/"')) {
  html = html.replace(/<head([^>]*)>/i, '<head$1>\n    <base href="/" />');
}
html = html.replace(
  /<!--\s*TripXto marketing landing[\s\S]*?-->\s*/i,
  ''
);
fs.writeFileSync(dst, html, 'utf8');

const styleSrc = path.join(repoRoot, 'project', 'style.css');
if (fs.existsSync(styleSrc)) {
  fs.copyFileSync(styleSrc, path.join(mobileRoot, 'public', 'tripxto.css'));
  fs.copyFileSync(styleSrc, path.join(mobileRoot, 'public', 'style.css'));
}

console.log('Synced marketing →', dst);
