import { stripTypeScriptTypes } from 'node:module';
import { mkdir, readdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist/assets', { recursive: true });
for (const name of await readdir('src')) {
  if (!name.endsWith('.ts')) continue;
  const source = await readFile(`src/${name}`, 'utf8');
  let js = stripTypeScriptTypes(source, { mode: 'strip' }).replace(/from (['"])(\.\.?\/[^'"]+)\.ts\1/g, 'from $1$2.js$1');
  js = js.replace("import './style.css';", '');
  await writeFile(`dist/assets/${name.replace(/\.ts$/, '.js')}`, js);
}
await cp('vendor/phaser.esm.min.js', 'dist/assets/phaser.esm.min.js');
await writeFile('dist/assets/phaser-bridge.js', "import * as Phaser from './phaser.esm.min.js';\nexport default Phaser;\n");
await cp('src/style.css', 'dist/assets/style.css');
let html = await readFile('app/index.html', 'utf8');
html = html.replace('</head>', '<link rel="stylesheet" href="./assets/style.css"><script type="importmap">{"imports":{"phaser":"./assets/phaser-bridge.js"}}</script></head>');
html = html.replace('../src/main.ts', './assets/main.js');
await writeFile('dist/index.html', html);
console.log('Portable TypeScript release built with vendored Phaser 3.90.0.');
