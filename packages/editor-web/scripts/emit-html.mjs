import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const distFile = path.resolve(dirname, '../dist/index.html');
const outputFile = path.resolve(dirname, '../../../apps/mobile/src/generated/editorHtml.ts');
const demoFile = path.resolve(dirname, '../../../docs/demo/editor.html');

const html = await readFile(distFile, 'utf8');
const banner = [
  '/*',
  ' * AUTO-GENERATED FILE. DO NOT EDIT.',
  ' * Run `npm run build:editor` to regenerate from packages/editor-web.',
  ' */',
  '',
].join('\n');
const source = `${banner}export const editorHtml = ${JSON.stringify(html)};\n`;

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, source, 'utf8');
await mkdir(path.dirname(demoFile), { recursive: true });
await writeFile(demoFile, html, 'utf8');
console.log(
  `[editor-web] wrote ${path.relative(process.cwd(), outputFile)} (${(html.length / 1024).toFixed(1)} KiB)`,
);
console.log(`[editor-web] wrote ${path.relative(process.cwd(), demoFile)} for the live LP demo`);
