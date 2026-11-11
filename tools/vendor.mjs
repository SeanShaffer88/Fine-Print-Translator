#!/usr/bin/env node
// Copies the pdf.js browser build into vendor/ so the app can load it from its
// own origin with no build step and no runtime downloads. Runs after npm install.
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'pdfjs-dist');
const dest = join(root, 'vendor', 'pdfjs');
if (!existsSync(src)) {
  console.error('pdfjs-dist is not installed. Run "npm install" first.');
  process.exit(1);
}
mkdirSync(dest, { recursive: true });
for (const f of ['build/pdf.min.mjs', 'build/pdf.worker.min.mjs', 'LICENSE']) {
  cpSync(join(src, f), join(dest, f.split('/').pop()));
}
console.log('Copied pdf.js to vendor/pdfjs');
