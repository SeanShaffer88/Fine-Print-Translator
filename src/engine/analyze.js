import { splitText } from './sections.js';
import { RULES, CATEGORIES, RULESET_VERSION, VALUE_LABELS } from './rules.js';

const RANK = { possible: 1, found: 2 };
const labels = (patterns, text) =>
  (patterns ?? []).filter(([, re]) => re.test(text)).map(([label]) => label);

/** Applies one rule to one sentence. Returns null when the rule does not apply. */
export function evaluateRule(rule, text) {
  const triggers = labels(rule.trigger, text);
  if (!triggers.length) return null;
  if (labels(rule.exclusion, text).length) return null;
  const negations = labels(rule.negation, text);
  const supports = labels(rule.supporting, text);
  const negated = negations.length > 0;
  let status = negated || supports.length ? 'found' : 'possible';
  if (rule.maxStatus === 'possible') status = 'possible';
  return {
    ruleId: rule.id,
    status,
    polarity: negated ? 'negated' : 'affirmed',
    signals: [...triggers, ...(negated ? negations : supports)],
    // No candidate values for negated wording: they would be misleading.
    values: negated ? {} : rule.extract?.(text) ?? {},
    explanation: rule.explanation,
  };
}

function findConflicts(matches) {
  const found = matches.filter((m) => m.status === 'found');
  const reasons = [];
  for (const key of Object.keys(VALUE_LABELS)) {
    const vals = [...new Set(found.map((m) => m.values[key]).filter(Boolean))];
    if (vals.length > 1) {
      reasons.push(`Passages give different candidate values for ${VALUE_LABELS[key].toLowerCase()}: ${vals.join(', ')}.`);
    }
  }
  const byRule = new Map();
  for (const m of found) byRule.set(m.ruleId, (byRule.get(m.ruleId) ?? new Set()).add(m.polarity));
  if ([...byRule.values()].some((s) => s.size > 1)) {
    reasons.push('One passage says this applies and another says it does not.');
  }
  return reasons;
}

/**
 * Analyzes plain text. Pure and deterministic: same text and rule set give the
 * same result. Performs no I/O and never logs.
 */
export function analyzeText(text) {
  const base = { rulesetVersion: RULESET_VERSION, textLength: text.length };
  if (!/[A-Za-z]{3}/.test(text)) {
    return {
      ...base,
      analyzable: false,
      reason: 'No readable text was provided.',
      sections: [],
      categories: CATEGORIES.map((c) => ({
        category: c.id, label: c.label, status: 'could_not_analyze',
        reviewNeeded: false, reviewReasons: [], matches: [],
      })),
    };
  }

  const { sections, units } = splitText(text);
  const byCategory = new Map(CATEGORIES.map((c) => [c.id, []]));

  for (const unit of units) {
    const best = new Map(); // strongest match per category for this sentence
    for (const rule of RULES) {
      const r = evaluateRule(rule, unit.text);
      if (!r) continue;
      const prev = best.get(rule.category);
      if (!prev || RANK[r.status] > RANK[prev.status]) best.set(rule.category, r);
    }
    for (const [category, r] of best) {
      byCategory.get(category).push({
        ...r,
        start: unit.start,
        end: unit.end,
        excerpt: unit.text,
        section: sections[unit.section].heading,
      });
    }
  }

  return {
    ...base,
    analyzable: true,
    sections,
    categories: CATEGORIES.map((c) => {
      const matches = byCategory.get(c.id);
      const status = matches.some((m) => m.status === 'found')
        ? 'found'
        : matches.length ? 'possible' : 'not_found';
      const reviewReasons = findConflicts(matches);
      return {
        category: c.id, label: c.label, status,
        reviewNeeded: reviewReasons.length > 0, reviewReasons, matches,
      };
    }),
  };
}

export { RULESET_VERSION, CATEGORIES, VALUE_LABELS };
