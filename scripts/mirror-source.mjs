import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const SOURCE = 'https://mobile-kitchen-facility-rental.com';
const PUBLIC_URL = 'https://mobile-kitchen-rental-now.vercel.app';
const out = join(process.cwd(), 'mirror');

const responseText = async (url) => {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
};

const brand = (html) => html
  .replaceAll('https://mobile-kitchen-facility-rental-com.vercel.app', PUBLIC_URL)
  .replaceAll('https://mobile-kitchen-facility-rental.com', PUBLIC_URL)
  .replaceAll('Mobile Kitchen Facility Rental', 'Mobile Kitchen Rental Now')
  .replaceAll('mobile-kitchen-facility-rental.com', 'mobile-kitchen-rental-now.vercel.app')
  .replaceAll('888-385-5513', '(800) 205-6106')
  .replaceAll('8883855513', '8002056106')
  .replaceAll('+18883855513', '+18002056106');

const absoluteAsset = (value) => {
  if (!value.startsWith('/') || value.startsWith('/assets/mobile-kitchen-rental-now')) return value;
  return `${SOURCE}${value}`;
};

const transform = (input) => {
  let html = brand(input)
    .replaceAll('/images/mobile-kitchen-facility-rental-logo.png', '/assets/mobile-kitchen-rental-now-logo.png')
    .replaceAll('/images/mobile-kitchen-facility-rental-mark.svg', '/assets/favicon.png');

  html = html.replace(/\b(src|poster|data-carousel-full-src)="(\/[^"]*)"/g, (_, attr, value) => `${attr}="${absoluteAsset(value)}"`);
  html = html.replace(/\bsrcset="([^"]*)"/g, (_, value) => {
    const rewritten = value.replace(/(^|,\s*)(\/[^\s,]+)/g, (_, prefix, path) => `${prefix}${SOURCE}${path}`);
    return `srcset="${rewritten}"`;
  });
  html = html.replace(/<link\b([^>]*?)href="(\/[^"]*)"([^>]*)>/g, (_, before, value, after) => {
    if (value === '/assets/favicon.png') return `<link${before}href="${value}"${after}>`;
    return `<link${before}href="${absoluteAsset(value)}"${after}>`;
  });
  html = html.replace('</head>', `<meta name="theme-color" content="#002B5B"><style>
    :root{--accent:#E10600;--accent-hover:#B30500;--brand-amber:#0073CE;--brand-blue:#002B5B;--brand-charcoal:#1F2937;--brand-copper:#E10600;--brand-green:#0073CE;--brand-linen:#F5F7FB;--brand-night:#002B5B;--brand-steel:#E5E7EB;--blue:#0073CE;--blue-hover:#005AA3;--home-navy:#002B5B;--home-cyan:#0073CE;--ink:#002B5B;--phone-emphasis:#E10600;--secondary-ink:#002B5B;--secondary-teal:#0073CE;--support-band:#002B5B;--support-band-hover:#001C3D}
    .brand-logo{max-height:72px;width:auto}.site-header .brand-logo{filter:none}
  </style></head>`);
  return html;
};

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const sitemap = await responseText(`${SOURCE}/sitemap.xml`);
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
const extraPaths = [
  '/about-us/', '/blog/', '/privacy/', '/man-camps-for-rent/',
  '/equipment-rental/shower-trailer/', '/services/shower-restroom-combination-trailers/',
  '/equipment-rental/restroom-trailers/', '/equipment-rental/mobile-sleep-trailers/',
  '/equipment-rental/laundry-trailers/', '/equipment-rental/handwashing-stations/'
];
const paths = [...new Set(['/', ...urls, ...extraPaths])];

for (const path of paths) {
  const html = transform(await responseText(`${SOURCE}${path}`));
  const target = path === '/' ? join(out, 'index.html') : join(out, path, 'index.html');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html);
  console.log(`Mirrored ${path}`);
}

const localSitemap = paths.map((path) => `<url><loc>${PUBLIC_URL}${path}</loc></url>`).join('');
await writeFile(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${localSitemap}</urlset>`);
await writeFile(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${PUBLIC_URL}/sitemap.xml\n`);
