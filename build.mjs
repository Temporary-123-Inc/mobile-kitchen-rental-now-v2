import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(root, 'mirror'), dist, { recursive: true });
await cp(join(root, 'assets'), join(dist, 'assets'), { recursive: true });
await cp(join(root, 'site.webmanifest'), join(dist, 'site.webmanifest'));

async function versionSharedStyles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return versionSharedStyles(path);
    if (!entry.name.endsWith('.html')) return;

    const html = await readFile(path, 'utf8');
    const updated = html.replaceAll(
      '/assets/brand-modern.css',
      '/assets/brand-modern.css?v=editorial-20261003',
    );
    if (updated !== html) await writeFile(path, updated);
  }));
}

await versionSharedStyles(dist);
console.log('Static site built in dist/');
