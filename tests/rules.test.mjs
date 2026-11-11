import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES, CATEGORIES, RULESET_VERSION } from '../src/engine/rules.js';
import { evaluateRule } from '../src/engine/analyze.js';
import { RULE_CASES } from './rule-cases.mjs';

test('rule set is versioned and well formed', () => {
  assert.match(RULESET_VERSION, /^\d+\.\d+\.\d+$/);
  const ids = RULES.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, 'rule ids are unique');
  for (const r of RULES) {
    assert.ok(CATEGORIES.some((c) => c.id === r.category), `${r.id}: known category`);
    assert.ok(r.trigger?.length && r.explanation, `${r.id}: trigger and explanation`);
  }
  for (const c of CATEGORIES) assert.ok(RULES.some((r) => r.category === c.id), `${c.id} has a rule`);
});

for (const rule of RULES) {
  test(rule.id, async (t) => {
    const cases = RULE_CASES[rule.id] ?? [];
    for (const kind of ['positive', 'negative', 'ambiguous']) {
      assert.ok(cases.some((c) => c.kind === kind), `needs a ${kind} case`);
    }
    for (const [i, c] of cases.entries()) {
      await t.test(`${c.kind} ${i}`, () => {
        const r = evaluateRule(rule, c.text);
        assert.equal(r?.status ?? null, c.expect);
        if (c.polarity) assert.equal(r.polarity, c.polarity);
        if (c.kind === 'ambiguous') assert.equal(r.status, 'possible');
        for (const [k, v] of Object.entries(c.values ?? {})) assert.equal(r.values[k], v);
      });
    }
  });
}
