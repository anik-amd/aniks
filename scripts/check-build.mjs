/**
 * Post-build checks. Runs in CI only, no dependencies.
 *
 * Guards the things that are easy to break and expensive to notice later:
 * SEO tags, structured data, the theme switcher contract, the 404 page,
 * and the "no client JS / no external requests" promise.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const ORIGIN = 'https://aniks.pages.dev';
const errors = [];
const fail = (message) => errors.push(message);

const path = (file) => join(DIST, file);

// 1. Required files
for (const file of [
  'index.html',
  '404.html',
  'robots.txt',
  'sitemap.xml',
  'og.png',
  'favicon.svg',
  '_headers',
  'fonts/instrument-sans-latin.woff2',
  'fonts/instrument-sans-italic-latin.woff2',
  'fonts/instrument-serif-latin.woff2',
  'fonts/instrument-serif-italic-latin.woff2',
  'fonts/OFL.txt',
]) {
  if (!existsSync(path(file))) fail(`missing dist/${file}`);
}

// 2. Social card is a real PNG at the advertised size
if (existsSync(path('og.png'))) {
  const png = readFileSync(path('og.png'));
  if (png.subarray(1, 4).toString() !== 'PNG') fail('og.png is not a PNG');
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== 1200 || height !== 630) {
    fail(`og.png is ${width}x${height}, expected 1200x630`);
  }
}

// 3. Homepage contract
if (existsSync(path('index.html'))) {
  const html = readFileSync(path('index.html'), 'utf8');
  const expect = (pattern, message) => {
    if (!pattern.test(html)) fail(message);
  };

  expect(/<html lang="en"/, 'html lang attribute missing');
  expect(/<title>[^<]{10,}<\/title>/, 'title missing or too short');
  expect(/<meta name="description" content="[^"]{50,}"/, 'description missing or too short');
  expect(
    new RegExp(`<link rel="canonical" href="${ORIGIN}/"`),
    'canonical link missing or wrong',
  );
  expect(
    new RegExp(`<meta property="og:image" content="${ORIGIN}/og\\.png"`),
    'og:image missing or wrong',
  );
  expect(/<meta name="twitter:card" content="summary_large_image"/, 'twitter card missing');
  expect(/<meta name="twitter:image:alt" content="[^"]{10,}"/, 'twitter image alt missing');
  expect(/<meta property="og:type" content="profile"/, 'og:type is not profile');
  expect(/<meta property="og:image:width" content="1200"/, 'og:image width missing');
  expect(/<meta property="og:image:height" content="630"/, 'og:image height missing');
  expect(/<meta property="og:image:type" content="image\/png"/, 'og:image type missing');
  expect(/<meta property="profile:username" content="aniks"/, 'profile username missing');
  expect(/<meta name="viewport" content="width=device-width, initial-scale=1"/, 'viewport missing');
  expect(
    /<link rel="preload" href="\/fonts\/instrument-sans-latin\.woff2"/,
    'font preload missing',
  );
  expect(
    /<link rel="preload" href="\/fonts\/instrument-serif-latin\.woff2"/,
    'display font preload missing',
  );

  // Exactly one h1
  const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1Count !== 1) fail(`expected exactly one <h1>, found ${h1Count}`);

  // Theme switcher contract: one button cycles system -> light -> dark.
  if (!html.includes('data-theme-cycle')) fail('theme cycle button missing');
  if (!html.includes('data-theme-state="system"')) fail('theme initial state missing');
  for (const value of ['system', 'light', 'dark']) {
    if (!html.includes(`'${value}'`)) fail(`theme state "${value}" missing from the cycle`);
  }
  if (!html.includes("localStorage.getItem('theme')")) fail('theme bootstrap script missing');

  // Structured data
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!jsonLd) {
    fail('JSON-LD block missing');
  } else {
    try {
      const data = JSON.parse(jsonLd[1]);
      if (data['@type'] !== 'Person') fail('JSON-LD is not a Person');
      if (!Array.isArray(data.sameAs) || data.sameAs.length < 5) {
        fail('JSON-LD sameAs incomplete');
      }
      if (!data.url?.startsWith(ORIGIN)) fail('JSON-LD url wrong');
    } catch (error) {
      fail(`JSON-LD does not parse: ${error.message}`);
    }
  }

  // No third-party resources
  const external = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="(https?:\/\/[^"]+)"/g)]
    .map((match) => match[1])
    .filter((url) => !url.startsWith(ORIGIN));
  if (external.length > 0) fail(`third-party resources: ${external.join(', ')}`);

  // Weight budget
  const bytes = Buffer.byteLength(html);
  if (bytes > 60_000) fail(`index.html too large: ${bytes} bytes`);
}

// 4. 404 page must not be indexed and must link home
if (existsSync(path('404.html'))) {
  const html = readFileSync(path('404.html'), 'utf8');
  if (!/<meta name="robots" content="noindex"/.test(html)) fail('404 page is indexable');
  if (!/href="\/"/.test(html)) fail('404 page has no link home');
}

// 5. robots.txt points at the sitemap
if (existsSync(path('robots.txt'))) {
  const robots = readFileSync(path('robots.txt'), 'utf8');
  if (!robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`)) fail('robots.txt sitemap line missing');
}

// 6. No client JavaScript bundles
const assetsDir = path('_astro');
if (existsSync(assetsDir)) {
  const js = readdirSync(assetsDir).filter((file) => file.endsWith('.js'));
  if (js.length > 0) fail(`unexpected JS bundles: ${js.join(', ')}`);
  const budget = readdirSync(assetsDir).reduce(
    (total, file) => total + statSync(join(assetsDir, file)).size,
    0,
  );
  if (budget > 60_000) fail(`dist/_astro budget exceeded: ${budget} bytes`);

  // Both faces must be declared locally, never linked from a font CDN.
  const css = readdirSync(assetsDir)
    .filter((file) => file.endsWith('.css'))
    .map((file) => readFileSync(join(assetsDir, file), 'utf8'))
    .join('\n');
  for (const family of ['Instrument Sans', 'Instrument Serif']) {
    if (!new RegExp(`font-family:\\s*['"]?${family}['"]?`).test(css)) {
      fail(`${family} @font-face missing from the built CSS`);
    }
  }
  if (/fonts\.(?:googleapis|gstatic)\.com/.test(css)) fail('font CDN reference in the CSS');
}

if (errors.length > 0) {
  console.error('Build checks failed:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log('Build checks passed.');
