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
 * Analyzes plain text. Pure and deterministic: same input and rule set give the
 * same result. Performs no I/O and never logs.
 *
 * @param {string} text
 * @param {{pages?: {number: number, start: number, end: number}[], incomplete?: boolean}} [opts]
 *   pages: page spans within text, used to give each match a page number.
 *   incomplete: true when part of the document could not be read. Categories
 *   without a match are then "could not analyze", never "not found".
 */
export function analyzeText(text, opts = {}) {
  const { pages = [], incomplete = false } = opts;
  const pageOf = (pos) => pages.find((p) => pos >= p.start && pos < p.end)?.number ?? null;
  const base = { rulesetVersion: RULESET_VERSION, textLength: text.length, incomplete };
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
    // Line breaks inside a sentence (hard-wrapped or PDF text) must not hide a phrase.
    const sentence = unit.text.replace(/\s+/g, ' ');
    for (const rule of RULES) {
      const r = evaluateRule(rule, sentence);
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
        page: pageOf(unit.start),
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
        : matches.length ? 'possible' : incomplete ? 'could_not_analyze' : 'not_found';
      const reviewReasons = findConflicts(matches);
      return {
        category: c.id, label: c.label, status,
        reviewNeeded: reviewReasons.length > 0, reviewReasons, matches,
      };
    }),
  };
}

export { RULESET_VERSION, CATEGORIES, VALUE_LABELS };
