import { cp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const item of ['index.html', 'robots.txt', 'sitemap.xml', 'site.webmanifest', 'vercel.json', 'src', 'assets']) {
  await cp(join(root, item), join(dist, item), { recursive: true });
}
console.log('Static site built in dist/');
