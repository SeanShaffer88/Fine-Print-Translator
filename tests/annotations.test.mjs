import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeText } from '../src/engine/analyze.js';
import { keyOf, effectiveValues, updateAnnotation, setValue } from '../src/ui/annotations.js';
import { buildReport } from '../src/ui/report.js';

const text = 'Your plan will automatically renew every month.\n\nThe fee is $5.00 per month.\n\nFees are non-refundable.';
const analysis = analyzeText(text);
const cat = (id) => analysis.categories.find((c) => c.category === id);
const renewal = cat('renewal').matches[0];
const price = cat('price').matches[0];
const meta = { name: 'doc', date: '2026-11-11' };

test('corrections sit on top of detected values and can be undone', () => {
  const a = {};
  const key = keyOf('price', price);
  setValue(a, key, price, 'amount', '$6.00');
  assert.equal(effectiveValues(price, a[key]).amount, '$6.00');
  assert.equal(price.values.amount, '$5.00', 'detected value is untouched');
  setValue(a, key, price, 'amount', '$5.00');
  assert.deepEqual(a, {}, 'restoring the detected value removes the correction');
});

test('empty annotations are removed', () => {
  const a = {};
  updateAnnotation(a, 'k', { note: 'x', mark: 'useful' });
  updateAnnotation(a, 'k', { note: '', mark: '' });
  assert.deepEqual(a, {});
});

test('annotations never change the analysis', () => {
  const before = JSON.stringify(analysis);
  const a = {};
  updateAnnotation(a, keyOf('renewal', renewal), { mark: 'incorrect', hidden: true, note: 'n' });
  buildReport(analysis, { ...meta, annotations: a });
  assert.equal(JSON.stringify(analysis), before);
});

test('report shows edits, marks, and notes, and leaves out hidden results', () => {
  const a = {};
  setValue(a, keyOf('price', price), price, 'amount', '$6.00');
  updateAnnotation(a, keyOf('price', price), { mark: 'useful', note: 'checked with\nsupport' });
  updateAnnotation(a, keyOf('renewal', renewal), { hidden: true });
  const report = buildReport(analysis, { ...meta, annotations: a });
  assert.match(report, /Candidate amount: \$6\.00 \(edited by you; detected: \$5\.00\)/);
  assert.match(report, /Your mark: Useful/);
  assert.match(report, /Your note: checked with support/);
  assert.ok(!report.includes(renewal.excerpt));
  assert.match(report, /1 result hidden by you is not shown/);
  assert.match(report, /## Renewal: Found/, 'hiding does not change the detected status');
  assert.match(report, /does not mean the document contains none/);
});
