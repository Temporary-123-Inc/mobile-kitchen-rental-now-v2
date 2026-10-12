import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = join(process.cwd(), 'dist');
const origin = 'https://mobile-kitchen-rental-now.com';
const files = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (entry.name.endsWith('.html')) files.push(path);
  }
}

await collect(root);

const routeFor = (path) => {
  const file = relative(root, path).replaceAll('\\', '/');
  if (file === 'index.html') return '/';
  if (file.endsWith('/index.html')) return `/${file.slice(0, -'index.html'.length)}`;
  return `/${file}`;
};

const routes = new Set(files.filter((path) => !path.endsWith('404.html')).map(routeFor));
const failures = [];
let internalLinks = 0;

for (const path of files) {
  const html = await readFile(path, 'utf8');
  const sourceRoute = routeFor(path);
  for (const match of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)) {
    const href = match[1].trim();
    if (!href || href.startsWith('#') || /^(?:mailto:|tel:|javascript:)/i.test(href)) continue;
    let target;
    try { target = new URL(href, `${origin}${sourceRoute}`); } catch { failures.push(`${sourceRoute}: malformed href ${href}`); continue; }
    if (target.origin !== origin) continue;
    if (target.pathname.startsWith('/api/') || /\.[a-z0-9]{2,5}$/i.test(target.pathname)) continue;
    internalLinks += 1;
    const pathname = decodeURI(target.pathname).replace(/\/{2,}/g, '/');
    const candidates = pathname === '/' ? ['/'] : [pathname, `${pathname.replace(/\/$/, '')}/`];
    if (!candidates.some((candidate) => routes.has(candidate))) failures.push(`${sourceRoute}: broken internal link ${href}`);
  }
}

console.log(JSON.stringify({ pages: files.length, internalLinks, brokenLinks: failures.length }, null, 2));
if (failures.length) {
  console.error(failures.slice(0, 100).join('\n'));
  process.exitCode = 1;
}
