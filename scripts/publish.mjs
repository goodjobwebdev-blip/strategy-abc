import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
// Only generated files are replaced. Documentation and source code stay intact.
await mkdir('assets', { recursive: true });
for (const name of await readdir('assets')) await rm(`assets/${name}`, { recursive: true, force: true });
await cp('dist/assets', 'assets', { recursive: true });
await cp('dist/index.html', 'index.html');
await writeFile('.nojekyll', '');
console.log('Static release ready in repository root.');
