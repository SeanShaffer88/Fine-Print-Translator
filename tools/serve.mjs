#!/usr/bin/env node
// Minimal static file server for local use. Serves app code only; it has no
// upload or API routes and never receives document content.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 5173;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const ALLOWED = /^\/(index\.html|src\/[\w./-]+\.(js|css))$/;

createServer(async (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (path === '/') path = '/index.html';
  if (req.method !== 'GET' || !ALLOWED.test(path) || path.includes('..')) {
    res.writeHead(404).end('Not found');
    return;
  }
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, {
      'Content-Type': `${TYPES[extname(path)] ?? 'application/octet-stream'}; charset=utf-8`,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    }).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, '0.0.0.0', () => console.log(`Fine-Print Translator: http://localhost:${port}`));
