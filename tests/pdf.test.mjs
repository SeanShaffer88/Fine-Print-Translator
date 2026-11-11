import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractPdfText, assembleLines, ExtractionError } from '../src/pdf/extract.js';
import { analyzeText } from '../src/engine/analyze.js';
import { makePdf } from './helpers/make-pdf.mjs';

const doc = (name) => readFileSync(new URL(`../test-corpus/documents/${name}`, import.meta.url), 'utf8');
const ann = (name) => JSON.parse(readFileSync(new URL(`../test-corpus/annotations/${name}`, import.meta.url), 'utf8'));
const code = (c) => (e) => e instanceof ExtractionError && e.code === c;

test('assembleLines keeps line breaks and adds paragraph breaks at large gaps', () => {
  const item = (str, y, hasEOL = true) => ({ str, hasEOL, height: 11, transform: [1, 0, 0, 1, 50, y] });
  const text = assembleLines([item('Heading', 700), item('first ', 686, false), item('line', 686), item('next para', 650)]);
  assert.equal(text, 'Heading\nfirst line\n\nnext para');
});

// Narrow wrapping puts line breaks inside sentences, as real PDFs do.
for (const width of [80, 45]) {
  for (const id of ['01-clear', '02-ambiguous', '03-contradictory', '04-absent', '05-negated']) {
    test(`${id} as a wrapped PDF (width ${width}) gives the annotated statuses`, async () => {
      const { text, pages, emptyPages } = await extractPdfText(pdfjs, makePdf([doc(`${id}.txt`)], { width }));
      assert.deepEqual(emptyPages, []);
      const result = analyzeText(text, { pages });
      for (const [cat, exp] of Object.entries(ann(`${id}.json`).categories)) {
        const got = result.categories.find((c) => c.category === cat);
        assert.equal(got.status, exp.expected_status, `${cat} status`);
        assert.equal(got.reviewNeeded, exp.review_needed, `${cat} review flag`);
        for (const m of got.matches) assert.equal(m.page, 1);
      }
    });
  }
}

test('matches carry the page they came from', async () => {
  const t = doc('01-clear.txt');
  const cut = t.indexOf('4. Cancellation');
  const { text, pages, pageCount } = await extractPdfText(pdfjs, makePdf([t.slice(0, cut), t.slice(cut)]));
  assert.equal(pageCount, 2);
  const result = analyzeText(text, { pages });
  const page = (cat) => result.categories.find((c) => c.category === cat).matches.map((m) => m.page);
  assert.deepEqual([...new Set(page('renewal'))], [1]);
  assert.deepEqual([...new Set(page('refund'))], [2]);
  for (const c of result.categories) for (const m of c.matches) assert.equal(text.slice(m.start, m.end), m.excerpt);
});

test('image-only PDF: no text, every page reported empty, nothing is "not found"', async () => {
  const r = await extractPdfText(pdfjs, makePdf(['', '']));
  assert.equal(r.text.trim(), '');
  assert.deepEqual(r.emptyPages, [1, 2]);
  assert.ok(analyzeText(r.text).categories.every((c) => c.status === 'could_not_analyze'));
});

test('partly unreadable PDF: unmatched categories are "could not analyze"', async () => {
  const r = await extractPdfText(pdfjs, makePdf(['Your plan will automatically renew every month.', '']));
  assert.deepEqual(r.emptyPages, [2]);
  const result = analyzeText(r.text, { pages: r.pages, incomplete: r.emptyPages.length > 0 });
  const status = Object.fromEntries(result.categories.map((c) => [c.category, c.status]));
  assert.equal(status.renewal, 'found');
  assert.equal(status.refund, 'could_not_analyze');
  assert.ok(!Object.values(status).includes('not_found'));
});

test('password-protected PDF is refused, not bypassed', async () => {
  await assert.rejects(extractPdfText(pdfjs, makePdf(['secret'], { encrypted: true })), code('encrypted'));
});

test('a file that is not a PDF is reported as invalid', async () => {
  await assert.rejects(extractPdfText(pdfjs, new Uint8Array([1, 2, 3, 4])), code('invalid'));
});

test('page limit is enforced', async () => {
  await assert.rejects(extractPdfText(pdfjs, makePdf(['a b c', 'd e f', 'g h i']), { maxPages: 2 }), code('too_many_pages'));
});

test('extraction can be cancelled and reports progress', async () => {
  const ctrl = new AbortController();
  const seen = [];
  const run = extractPdfText(pdfjs, makePdf(['one one', 'two two', 'three three']), {
    signal: ctrl.signal,
    onProgress: (n, total) => { seen.push(`${n}/${total}`); if (n === 2) ctrl.abort(); },
  });
  await assert.rejects(run, code('cancelled'));
  assert.deepEqual(seen, ['1/3', '2/3']);
});

test('errors carry a code only, never document text', async () => {
  try {
    await extractPdfText(pdfjs, makePdf(['UNIQUE-MARKER-TEXT'], { encrypted: true }));
    assert.fail('expected rejection');
  } catch (e) {
    assert.ok(!String(e.message + e.stack).includes('UNIQUE-MARKER-TEXT'));
  }
});
