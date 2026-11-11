import { VALUE_LABELS } from '../engine/rules.js';
import { MARKS, keyOf, effectiveValues } from './annotations.js';

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

export function matchExplanation(m) {
  const neg = m.polarity === 'negated'
    ? ' The wording appears to say this does not apply.' : '';
  return `${m.explanation}${neg} Detected: ${m.signals.join('; ')}.`;
}

/**
 * Plain-text/Markdown report. Built locally; contains document excerpts and
 * the user's notes. Results the user hid are left out and counted.
 */
export function buildReport(analysis, { name, date, note = '', annotations = {} }) {
  const out = [
    '# Fine-Print Translator report', '',
    `Document: ${name}`, `Analyzed: ${date}`, `Rule set: ${analysis.rulesetVersion}`, '',
    'These are pointers to wording, not legal advice. Candidate values are not authoritative.',
    '"Not found" means no supported pattern was detected. It does not mean the document contains none.', '',
  ];
  if (note) out.push(`Extraction: ${note}`, '');
  for (const c of analysis.categories) {
    const s = STATUS[c.status];
    out.push(`## ${c.label}: ${s.label}${c.reviewNeeded ? ' (Review needed)' : ''}`, '', s.text, '');
    for (const r of c.reviewReasons) out.push(`Review needed: ${r} No passage is treated as authoritative.`, '');
    let hidden = 0;
    for (const m of c.matches) {
      const ann = annotations[keyOf(c.category, m)] ?? {};
      if (ann.hidden) { hidden++; continue; }
      out.push(`- ${STATUS[m.status].label}${m.page ? `, page ${m.page}` : ''}${m.section ? ` (section: ${m.section})` : ''}, characters ${m.start}-${m.end}`);
      out.push(`  > ${m.excerpt.replace(/\s+/g, ' ')}`);
      out.push(`  ${matchExplanation(m)}`);
      for (const [k, v] of Object.entries(effectiveValues(m, ann))) {
        const edited = ann.values && k in ann.values;
        out.push(`  Candidate ${VALUE_LABELS[k].toLowerCase()}: ${v}${edited ? ` (edited by you; detected: ${m.values[k]})` : ''}`);
      }
      if (ann.mark) out.push(`  Your mark: ${MARKS[ann.mark]}`);
      if (ann.note) out.push(`  Your note: ${ann.note.replace(/\s+/g, ' ')}`);
      out.push('');
    }
    if (hidden) out.push(`${hidden} result${hidden === 1 ? '' : 's'} hidden by you ${hidden === 1 ? 'is' : 'are'} not shown.`, '');
  }
  return out.join('\n');
}
