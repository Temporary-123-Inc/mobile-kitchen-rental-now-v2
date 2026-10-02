import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const item of ['index.html','robots.txt','sitemap.xml','site.webmanifest','vercel.json','src','public/assets']) {
  const target = item === 'public/assets' ? 'dist/assets' : `dist/${item}`;
  await cp(item, target, { recursive: true });
}
console.log('Static production build written to dist/');
