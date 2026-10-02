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
  .replaceAll('Commercial kitchen rental systems', 'Kitchen capacity. Ready to deploy.')
  .replaceAll('<h1 id="rental-title">Temporary Commercial <br><em>Mobile Kitchen Trailer Rentals Nationwide</em></h1>', '<style>.rental-hero .tiered-headline{display:grid;gap:.03em;font-size:clamp(1.85rem,5.5vw,4.6rem);line-height:.9}.rental-hero .tiered-headline>span{display:block!important;white-space:nowrap}.rental-hero .tiered-headline>span:nth-child(even){color:#E10600}</style><h1 id="rental-title" class="tiered-headline"><span>Mobile Kitchens.</span><span>Built to Perform.</span><span>Delivered Nationwide.</span><span>Ready When You Are.</span></h1>')
  .replaceAll('Mobile Kitchen <span>Facility Rental</span>', 'Mobile Kitchen <span>Rental Now</span>')
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
  html = html.replace('</head>', `<link rel="stylesheet" href="/assets/brand-modern.css"><meta name="theme-color" content="#002B5B"><style>
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
const queue = [...new Set(['/', ...urls, ...extraPaths])];
const queued = new Set(queue);
const mirrored = [];
const maxPages = 650;

const discover = (html) => {
  for (const match of html.matchAll(/href="(\/[^"]*)"/g)) {
    const url = new URL(match[1], SOURCE);
    let path = url.pathname;
    if (/^\/(?:_|assets|images|media|api)\//.test(path) || /\.[a-z0-9]{2,6}$/i.test(path)) continue;
    if (!path.endsWith('/')) path += '/';
    if (!queued.has(path) && queued.size < maxPages) {
      queued.add(path);
      queue.push(path);
    }
  }
};

while (queue.length && mirrored.length < maxPages) {
  const path = queue.shift();
  try {
    const sourceHtml = await responseText(`${SOURCE}${path}`);
    discover(sourceHtml);
    const target = path === '/' ? join(out, 'index.html') : join(out, path, 'index.html');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, transform(sourceHtml));
    mirrored.push(path);
    console.log(`Mirrored ${path}`);
  } catch (error) {
    console.warn(`Skipped ${path}: ${error.message}`);
  }
}

const localSitemap = mirrored.map((path) => `<url><loc>${PUBLIC_URL}${path}</loc></url>`).join('');
await writeFile(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${localSitemap}</urlset>`);
await writeFile(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${PUBLIC_URL}/sitemap.xml\n`);
