import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { analyzeText } from '../src/engine/analyze.js';

const dir = new URL('../test-corpus/', import.meta.url);
const overlaps = (a, b) => a.start < b.end && b.start < a.end;
const RANK = { possible: 1, found: 2 };

for (const file of readdirSync(new URL('annotations/', dir)).sort()) {
  const ann = JSON.parse(readFileSync(new URL(`annotations/${file}`, dir), 'utf8'));
  const text = readFileSync(new URL(`documents/${ann.document}`, dir), 'utf8');
  const result = analyzeText(text);
  const cat = (id) => result.categories.find((c) => c.category === id);

  test(ann.document, async (t) => {
    for (const [id, exp] of Object.entries(ann.categories)) {
      await t.test(id, () => {
        const got = cat(id);
        // Messages deliberately omit document text.
        assert.equal(got.status, exp.expected_status, 'status');
        assert.equal(got.reviewNeeded, exp.review_needed, 'review flag');
        exp.passages.forEach((p, i) => {
          const hits = got.matches.filter((m) => overlaps(m, p));
          assert.ok(hits.length, `annotated passage ${i} was not surfaced`);
          const top = hits.sort((a, b) => RANK[b.status] - RANK[a.status])[0];
          // Polarity is only asserted for "found": a possible match makes no such claim.
          if (top.status === 'found') assert.equal(top.polarity, p.polarity, `passage ${i} polarity`);
        });
        for (const m of got.matches) {
          assert.equal(text.slice(m.start, m.end), m.excerpt, 'span matches excerpt');
        }
      });
    }
    for (const [i, d] of (ann.distractors ?? []).entries()) {
      await t.test(`distractor ${i}`, () => {
        const start = text.indexOf(d.quote);
        const span = { start, end: start + d.quote.length };
        assert.ok(!cat(d.category).matches.some((m) => overlaps(m, span)), 'distractor matched');
      });
    }
  });
}

test('empty or unreadable text is "could not analyze", never "not found"', () => {
  for (const input of ['', '   \n\n ', '12 34 -- ..']) {
    const r = analyzeText(input);
    assert.equal(r.analyzable, false);
    assert.ok(r.categories.every((c) => c.status === 'could_not_analyze'));
  }
});

test('analysis is deterministic', () => {
  const text = readFileSync(new URL('documents/03-contradictory.txt', dir), 'utf8');
  assert.deepEqual(analyzeText(text), analyzeText(text));
});
