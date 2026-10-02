import { cp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(root, 'mirror'), dist, { recursive: true });
await cp(join(root, 'assets'), join(dist, 'assets'), { recursive: true });
await cp(join(root, 'site.webmanifest'), join(dist, 'site.webmanifest'));
console.log('Static site built in dist/');
