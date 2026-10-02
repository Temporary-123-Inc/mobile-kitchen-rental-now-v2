import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = join(process.cwd(), 'dist');
const files = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (entry.name.endsWith('.html')) files.push(path);
  }
}

await collect(root);

const failures = [];
const locationHooks = new Map();
let services = 0;
let locations = 0;

for (const path of files) {
  const html = await readFile(path, 'utf8');
  const route = relative(root, path).replaceAll('\\', '/');
  const h1s = [...html.matchAll(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi)];

  if (!/<meta\s+name="viewport"/i.test(html)) failures.push(`${route}: missing viewport meta`);
  if (h1s.length !== 1) failures.push(`${route}: expected one H1, found ${h1s.length}`);

  if (route.startsWith('services/')) {
    services += 1;
    const tiers = h1s[0]?.[0].match(/<span>/g)?.length ?? 0;
    if (!h1s[0]?.[0].includes('four-tier-heading') || tiers !== 4) {
      failures.push(`${route}: service H1 is not four-tier`);
    }
  }

  if (route.startsWith('service-areas/') && route !== 'service-areas/index.html') {
    locations += 1;
    const tiers = h1s[0]?.[0].match(/<span>/g)?.length ?? 0;
    if (!h1s[0]?.[0].includes('four-tier-heading') || tiers !== 4) {
      failures.push(`${route}: location H1 is not four-tier`);
    }

    const hook = html.match(/<p class="location-conversion-hook">([\s\S]*?)<\/p>/i)?.[1];
    if (!hook) failures.push(`${route}: missing local conversion hook`);
    else {
      const prior = locationHooks.get(hook);
      if (prior) failures.push(`${route}: duplicate local hook also used by ${prior}`);
      locationHooks.set(hook, route);
    }
  }
}

console.log(JSON.stringify({
  pages: files.length,
  servicePages: services,
  locationPages: locations,
  uniqueLocationHooks: locationHooks.size,
  failures: failures.length,
}, null, 2));

if (failures.length) {
  console.error(failures.slice(0, 100).join('\n'));
  process.exitCode = 1;
}
