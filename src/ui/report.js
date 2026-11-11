import { VALUE_LABELS } from '../engine/rules.js';

export const STATUS = {
  found: { icon: '✓', label: 'Found', text: 'A rule matched this wording.' },
  possible: { icon: '?', label: 'Possible match', text: 'This wording may be relevant.' },
  not_found: {
    icon: '○', label: 'Not found',
    text: 'No supported pattern was detected. This does not mean the document contains none.',
  },
  could_not_analyze: {
    icon: '!', label: 'Could not analyze',
    text: 'Text could not be read, so the rules could not run.',
  },
};

export const valueLines = (values) =>
  Object.entries(values).map(([k, v]) => `Candidate ${VALUE_LABELS[k].toLowerCase()}: ${v}`);

export function matchExplanation(m) {
  const neg = m.polarity === 'negated'
    ? ' The wording appears to say this does not apply.' : '';
  return `${m.explanation}${neg} Detected: ${m.signals.join('; ')}.`;
}

/** Plain-text/Markdown report. Built locally; contains document excerpts. */
export function buildReport(analysis, name, date) {
  const out = [
    '# Fine-Print Translator report', '',
    `Document: ${name}`, `Analyzed: ${date}`, `Rule set: ${analysis.rulesetVersion}`, '',
    'These are pointers to wording, not legal advice. Candidate values are not authoritative.',
    '"Not found" means no supported pattern was detected. It does not mean the document contains none.', '',
  ];
  for (const c of analysis.categories) {
    const s = STATUS[c.status];
    out.push(`## ${c.label}: ${s.label}${c.reviewNeeded ? ' (Review needed)' : ''}`, '', s.text, '');
    for (const r of c.reviewReasons) out.push(`Review needed: ${r} Neither passage is treated as authoritative.`, '');
    for (const m of c.matches) {
      out.push(`- ${STATUS[m.status].label}${m.section ? ` (section: ${m.section})` : ''}, characters ${m.start}-${m.end}`);
      out.push(`  > ${m.excerpt.replace(/\s+/g, ' ')}`);
      out.push(`  ${matchExplanation(m)}`);
      for (const v of valueLines(m.values)) out.push(`  ${v}`);
      out.push('');
    }
  }
  return out.join('\n');
}
