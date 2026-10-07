import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ORIGIN = 'https://mobile-kitchen-rental-now.com';
const LEGACY_ORIGINS = [
  'https://mobile-kitchen-rental-now.vercel.app',
  'https://www.mobile-kitchen-rental-now.com',
];

const escapeXml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const routeFor = (file, dist) => {
  const path = relative(dist, file).replaceAll('\\', '/');
  if (path === 'index.html') return '/';
  if (path.endsWith('/index.html')) return `/${path.slice(0, -'index.html'.length)}`;
  return `/${path}`;
};

const upsertMeta = (html, name, content) => {
  const tag = `<meta name="${name}" content="${content}">`;
  const expression = new RegExp(`<meta\\s+name=["']${name}["'][^>]*>`, 'i');
  return expression.test(html) ? html.replace(expression, tag) : html.replace('</head>', `${tag}</head>`);
};

const upsertCanonical = (html, url) => {
  const tag = `<link rel="canonical" href="${url}">`;
  const expression = /<link\s+rel=["']canonical["'][^>]*>/i;
  return expression.test(html) ? html.replace(expression, tag) : html.replace('</head>', `${tag}</head>`);
};

const upsertOgUrl = (html, url) => {
  const tag = `<meta property="og:url" content="${url}">`;
  const expression = /<meta\s+property=["']og:url["'][^>]*>/i;
  return expression.test(html) ? html.replace(expression, tag) : html.replace('</head>', `${tag}</head>`);
};

async function collectHtml(directory, files = []) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return files;
    throw error;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collectHtml(path, files);
    else if (entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

async function create404(dist) {
  const base = await readFile(join(dist, 'index.html'), 'utf8');
  const main = `<main id="main" tabindex="-1"><section class="wrap section" aria-labelledby="not-found-title"><span class="eyebrow">PAGE NOT FOUND</span><h1 id="not-found-title">The requested page could not be found.</h1><p>The address may have changed or the page may no longer exist. Return to the homepage or review the available rental equipment.</p><div class="json-hero-actions"><a class="button" href="/">Return home</a><a class="button button-secondary" href="/equipment-rental/">Browse rental equipment</a></div></section></main>`;
  let html = base
    .replace(/<title>[\s\S]*?<\/title>/i, '<title>Page Not Found | Mobile Kitchen Rental Now</title>')
    .replace(/<meta name="description" content="[^"]*">/i, '<meta name="description" content="The requested page could not be found. Browse Mobile Kitchen Rental Now services and equipment.">')
    .replace(/<main id="main"[\s\S]*?<\/main>/i, main)
    .replace(/<link\s+rel=["']canonical["'][^>]*>/i, '')
    .replace(/<meta\s+property=["']og:url["'][^>]*>/i, '');
  html = upsertMeta(html, 'robots', 'noindex, nofollow');
  await writeFile(join(dist, '404.html'), html);
}

export async function buildSeoIndexingFiles({ dist }) {
  await mkdir(dist, { recursive: true });
  await create404(dist);
  const htmlFiles = await collectHtml(dist);
  const sitemapUrls = [];

  const processFile = async (file) => {
    const route = routeFor(file, dist);
    const is404 = route === '/404.html';
    let html = await readFile(file, 'utf8');
    for (const legacyOrigin of LEGACY_ORIGINS) html = html.replaceAll(legacyOrigin, ORIGIN);
    html = upsertMeta(html, 'robots', is404 ? 'noindex, nofollow' : 'index, follow');

    if (is404) {
      html = html
        .replace(/<link\s+rel=["']canonical["'][^>]*>/i, '')
        .replace(/<meta\s+property=["']og:url["'][^>]*>/i, '');
    } else {
      const canonical = `${ORIGIN}${route}`;
      html = upsertCanonical(html, canonical);
      html = upsertOgUrl(html, canonical);
      sitemapUrls.push(canonical);
    }

    await writeFile(file, html);
  };

  for (let index = 0; index < htmlFiles.length; index += 48) {
    await Promise.all(htmlFiles.slice(index, index + 48).map(processFile));
  }

  const urls = [...new Set(sitemapUrls)].sort((a, b) => a.localeCompare(b));
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`;
  await writeFile(join(dist, 'sitemap.xml'), sitemap);
  await writeFile(join(dist, 'robots.txt'), robots);

  return { origin: ORIGIN, indexableUrls: urls.length };
}
