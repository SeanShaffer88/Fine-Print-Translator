#!/usr/bin/env node
// Validates test-corpus annotations against their documents.
//   node tools/check-corpus.mjs          verify quotes, offsets, and schema
//   node tools/check-corpus.mjs --write  recompute start/end offsets from quotes
// Offsets are JavaScript string indices (UTF-16 code units), end-exclusive.
// Output never includes document text: only file names, categories, and indices.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'test-corpus');
const write = process.argv.includes('--write');
const CATEGORIES = ['trial', 'renewal', 'price', 'cancellation', 'refund'];
const STATUSES = ['found', 'possible', 'not_found'];
const POLARITIES = ['affirmed', 'negated'];
const errors = [];

const files = readdirSync(join(root, 'annotations')).filter((f) => f.endsWith('.json')).sort();
for (const file of files) {
  const path = join(root, 'annotations', file);
  const ann = JSON.parse(readFileSync(path, 'utf8'));
  const err = (msg) => errors.push(`${file}: ${msg}`);
  let text;
  try {
    text = readFileSync(join(root, 'documents', ann.document), 'utf8');
  } catch {
    err(`document "${ann.document}" not found`);
    continue;
  }
  if (text.includes('\r')) err('document contains CR characters; offsets would be unstable');

  for (const cat of CATEGORIES) {
    const c = ann.categories?.[cat];
    if (!c) { err(`missing category ${cat}`); continue; }
    if (!STATUSES.includes(c.expected_status)) err(`${cat}: invalid expected_status`);
    if (typeof c.review_needed !== 'boolean') err(`${cat}: review_needed must be boolean`);
    const n = c.passages?.length ?? 0;
    if (c.expected_status === 'not_found' && n) err(`${cat}: not_found must have no passages`);
    if (c.expected_status !== 'not_found' && !n) err(`${cat}: ${c.expected_status} needs a passage`);
    if (c.review_needed && n < 2) err(`${cat}: review_needed expects at least two passages`);
    (c.passages ?? []).forEach((p, i) => {
      const where = `${cat} passage ${i}`;
      if (!POLARITIES.includes(p.polarity)) err(`${where}: invalid polarity`);
      const start = text.indexOf(p.quote);
      if (start === -1) return err(`${where}: quote not present in document`);
      if (text.indexOf(p.quote, start + 1) !== -1) return err(`${where}: quote is not unique`);
      const end = start + p.quote.length;
      if (write) { p.start = start; p.end = end; }
      else if (p.start !== start || p.end !== end) err(`${where}: offsets stale (run with --write)`);
    });
  }
  for (const key of Object.keys(ann.categories ?? {})) {
    if (!CATEGORIES.includes(key)) err(`unknown category ${key}`);
  }
  for (const [i, d] of (ann.distractors ?? []).entries()) {
    if (!text.includes(d.quote)) err(`distractor ${i}: quote not present in document`);
  }
  if (write) writeFileSync(path, JSON.stringify(ann, null, 2) + '\n');
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problem(s) in ${files.length} annotation file(s).`);
  process.exit(1);
}
console.log(`${files.length} annotation file(s) ${write ? 'updated' : 'verified'}.`);
