import { analyzeText, RULESET_VERSION } from '../engine/analyze.js';
import { STATUS, valueLines, matchExplanation, buildReport } from './report.js';

const MAX_CHARS = 1_000_000;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

// Held in memory only. Nothing is written to storage or sent anywhere.
let state = null;

const SAMPLE = `Example Music Membership Terms

1. Trial
New members receive a 30-day free trial. When the trial ends you will be charged the monthly fee unless you cancel first.

2. Renewal
Your membership automatically renews every month.

3. Price
The membership fee is $7.99 per month. We may increase the fee after giving you 30 days' notice.

4. Cancelling
You may cancel at any time in Account Settings. Annual members must give 14 days' notice to cancel.

5. Refunds
Fees are non-refundable. Annual members may request a refund within 14 days of purchase.
`;

function setMessage(text) { $('message').textContent = text; }

function validate(text) {
  if (!text.trim()) return 'Paste some text or choose a file first.';
  if (text.length > MAX_CHARS) return 'This text is longer than 1,000,000 characters. Try a shorter section.';
  return null;
}

function renderCard(c) {
  const s = STATUS[c.status];
  const card = el('article', { className: `card status-${c.status}` });
  card.setAttribute('aria-labelledby', `card-${c.category}`);
  card.append(
    el('h3', { id: `card-${c.category}` }, c.label),
    el('p', { className: 'status' },
      el('span', { className: 'icon', ariaHidden: 'true' }, s.icon),
      el('strong', {}, ` ${s.label}`),
      c.reviewNeeded ? el('strong', { className: 'review' }, ' ⚠ Review needed') : ''),
    el('p', {}, s.text),
  );
  for (const r of c.reviewReasons) {
    card.append(el('p', { className: 'review-reason' },
      `${r} Both passages are shown. Neither is treated as authoritative.`));
  }
  if (c.matches.length) {
    const list = el('ol', { className: 'matches' });
    for (const m of c.matches) {
      const item = el('li', {},
        el('p', { className: 'match-status' },
          `${STATUS[m.status].icon} ${STATUS[m.status].label}${m.section ? `, in section “${m.section}”` : ''}`),
        el('blockquote', {}, m.excerpt),
        el('p', { className: 'why' }, matchExplanation(m)),
      );
      for (const v of valueLines(m.values)) item.append(el('p', { className: 'value' }, v));
      const link = el('a', { href: `#p-${m.start}` }, 'Show this passage in the document');
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = $(`p-${m.start}`);
        target.scrollIntoView({ block: 'center' });
        target.focus({ preventScroll: true });
      });
      item.append(link);
      list.append(item);
    }
    card.append(list);
  }
  return card;
}

function renderDocument(text, analysis) {
  const box = $('doc-text');
  box.replaceChildren();
  const spans = new Map();
  for (const c of analysis.categories) {
    for (const m of c.matches) {
      const e = spans.get(m.start) ?? { start: m.start, end: m.end, labels: [] };
      e.labels.push(`${c.label}: ${STATUS[m.status].label}`);
      spans.set(m.start, e);
    }
  }
  let pos = 0;
  for (const s of [...spans.values()].sort((a, b) => a.start - b.start)) {
    box.append(text.slice(pos, s.start));
    const mark = el('mark', { id: `p-${s.start}`, tabIndex: -1 }, text.slice(s.start, s.end));
    mark.setAttribute('aria-label', `Matched passage. ${s.labels.join('. ')}. ${text.slice(s.start, s.end)}`);
    box.append(mark);
    pos = s.end;
  }
  box.append(text.slice(pos));
}

function run(text, name) {
  const problem = validate(text);
  if (problem) return setMessage(problem);
  setMessage('');
  const analysis = analyzeText(text);
  state = { analysis, text, name, date: new Date().toISOString().slice(0, 10) };

  const count = (st) => analysis.categories.filter((c) => c.status === st).length;
  $('summary').textContent = analysis.analyzable
    ? `${count('found')} found, ${count('possible')} possible, ${count('not_found')} not found, of ${analysis.categories.length} categories.`
    : `Could not analyze: ${analysis.reason}`;
  $('cards').replaceChildren(...analysis.categories.map(renderCard));
  renderDocument(text, analysis);
  $('results').hidden = false;
  $('document').hidden = false;
  $('results-h').focus();
}

function discard() {
  state = null;
  $('text').value = '';
  $('file').value = '';
  $('cards').replaceChildren();
  $('doc-text').replaceChildren();
  $('results').hidden = true;
  $('document').hidden = true;
  setMessage('Document and results discarded.');
  $('text').focus();
}

function exportReport() {
  if (!state) return;
  const blob = new Blob([buildReport(state.analysis, state.name, state.date)], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: 'fine-print-report.md' });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

$('version').textContent = RULESET_VERSION;
$('analyze').addEventListener('click', () => run($('text').value, 'Pasted text'));
$('sample').addEventListener('click', () => { $('text').value = SAMPLE; run(SAMPLE, 'Built-in sample'); });
$('discard').addEventListener('click', discard);
$('export').addEventListener('click', exportReport);
$('file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
  if (isPdf) return setMessage('PDF files are not supported yet. Copy the text from the PDF and paste it instead.');
  if (!/\.txt$/i.test(file.name) && file.type !== 'text/plain') {
    return setMessage('Only plain-text (.txt) files are supported. You can paste text instead.');
  }
  if (file.size > MAX_FILE_BYTES) return setMessage('This file is larger than 2 MB. Try pasting the relevant part.');
  let text;
  try {
    text = await file.text();
  } catch {
    return setMessage('The file could not be read.'); // no file name or content in messages
  }
  $('text').value = text;
  run(text, file.name);
});
