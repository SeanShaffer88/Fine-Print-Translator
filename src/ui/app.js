import { analyzeText, RULESET_VERSION } from '../engine/analyze.js';
import { VALUE_LABELS } from '../engine/rules.js';
import { STATUS, matchExplanation, buildReport } from './report.js';
import { MARKS, keyOf, effectiveValues, updateAnnotation, setValue } from './annotations.js';
import { createStore } from '../storage/store.js';

const MAX_CHARS = 1_000_000;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_PDF_PAGES = 300;
const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

// The open document lives in memory. It is written to this device's storage
// only after the user presses "Save on this device". Nothing is sent anywhere.
let state = null;
let store = null;
try { store = createStore(); } catch { /* saving is unavailable; the app still works */ }
const STORAGE_PROBLEM = 'Saving is not available in this browser. You can still analyze and export.';

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

// ---- Saving -----------------------------------------------------------------

const record = () => ({
  id: state.id, name: state.name, date: state.date, savedAt: state.savedAt,
  rulesetVersion: state.analysis.rulesetVersion, text: state.text, pages: state.pages,
  incomplete: state.incomplete, note: state.note, analysis: state.analysis,
  annotations: state.annotations,
});

let persistTimer = null;
function persistSoon() {
  if (!state?.id) return; // not saved: keep everything in memory only
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistNow, 400);
}
async function persistNow() {
  clearTimeout(persistTimer);
  if (!state?.id) return;
  try { await store.save(record()); } catch { setMessage(STORAGE_PROBLEM); }
}

function annotate(key, patch) {
  updateAnnotation(state.annotations, key, patch);
  persistSoon();
}

function renderSaveState() {
  const saved = !!state?.id;
  $('save').textContent = saved ? 'Delete saved copy' : 'Save on this device';
  $('save').disabled = !store;
  $('discard').textContent = saved ? 'Close document' : 'Discard document and results';
  $('save-status').textContent = !store ? STORAGE_PROBLEM
    : saved
      ? 'Saved on this device. Your notes and corrections are saved as you make them. The saved copy holds the document text and is not encrypted.'
      : 'Not saved. Closing this page discards the document, results, and any notes.';
}

async function renderSavedList() {
  let items = [];
  try { items = store ? await store.list() : []; } catch { /* treated as nothing saved */ }
  $('saved').hidden = !items.length;
  $('saved-list').replaceChildren(...items.map((it) => {
    const open = el('button', { type: 'button' }, 'Open');
    open.setAttribute('aria-label', `Open ${it.name}`);
    open.addEventListener('click', () => openSaved(it.id));
    const del = el('button', { type: 'button' }, 'Delete');
    del.setAttribute('aria-label', `Delete ${it.name}`);
    del.addEventListener('click', () => deleteSaved(it.id, it.name));
    return el('li', {},
      el('span', { className: 'saved-name' }, it.name),
      el('span', { className: 'hint' }, ` analyzed ${it.date}, rule set ${it.rulesetVersion} `),
      open, del);
  }));
}

async function toggleSave() {
  if (!state || !store) return;
  if (state.id) return deleteSaved(state.id, state.name);
  state.id = crypto.randomUUID();
  state.savedAt = Date.now();
  try {
    await store.save(record());
  } catch {
    state.id = null;
    return setMessage(STORAGE_PROBLEM);
  }
  renderSaveState();
  renderSavedList();
}

async function deleteSaved(id, name) {
  if (!confirm(`Delete the saved analysis of “${name}” from this device? This removes its results, document text, notes, and corrections. Your original file and any exported reports are not affected.`)) return;
  clearTimeout(persistTimer);
  try { await store.remove(id); } catch { return setMessage(STORAGE_PROBLEM); }
  if (state?.id === id) { state.id = null; renderSaveState(); }
  await renderSavedList();
  setMessage('Saved analysis deleted.');
}

async function deleteAll() {
  if (!confirm('Delete all saved analyses from this device? This cannot be undone. Your original files and any exported reports are not affected.')) return;
  clearTimeout(persistTimer);
  try { await store.removeAll(); } catch { return setMessage(STORAGE_PROBLEM); }
  if (state) { state.id = null; renderSaveState(); }
  await renderSavedList();
  setMessage('All saved analyses deleted.');
}

async function openSaved(id) {
  await persistNow();
  let r;
  try { r = await store.get(id); } catch { return setMessage(STORAGE_PROBLEM); }
  if (!r) { await renderSavedList(); return setMessage('That saved analysis no longer exists.'); }
  state = {
    id: r.id, savedAt: r.savedAt, name: r.name, date: r.date, text: r.text, pages: r.pages,
    incomplete: r.incomplete, note: r.note ?? '', analysis: r.analysis,
    annotations: r.annotations ?? {}, showHidden: {},
  };
  $('text').value = r.text;
  setMessage('');
  show();
}

function reanalyze() {
  if (!state) return;
  state.analysis = analyzeText(state.text, { pages: state.pages, incomplete: state.incomplete });
  state.date = new Date().toISOString().slice(0, 10);
  persistSoon();
  show();
  renderSavedList();
}

// ---- Results ----------------------------------------------------------------

function renderMatch(c, m) {
  const key = keyOf(c.category, m);
  const ann = () => state.annotations[key] ?? {};
  const uid = `${c.category}-${m.start}`;
  const item = el('li', {});
  const yourMark = el('span', { className: 'your-mark' });
  const showMark = () => { yourMark.textContent = ann().mark ? ` · You marked this ${MARKS[ann().mark].toLowerCase()}` : ''; };
  showMark();
  item.append(
    el('p', { className: 'match-status' },
      `${STATUS[m.status].icon} ${STATUS[m.status].label}${m.page ? `, page ${m.page}` : ''}${m.section ? `, in section “${m.section}”` : ''}`,
      yourMark),
    el('blockquote', {}, m.excerpt),
    el('p', { className: 'why' }, matchExplanation(m)),
  );

  for (const [field, value] of Object.entries(effectiveValues(m, ann()))) {
    const input = el('input', { type: 'text', id: `v-${uid}-${field}`, value, maxLength: 60 });
    const detected = el('span', { className: 'hint' });
    const showDetected = () => {
      detected.textContent = ann().values && field in ann().values ? ` Edited by you. Detected: ${m.values[field]}` : '';
    };
    showDetected();
    input.addEventListener('input', () => {
      setValue(state.annotations, key, m, field, input.value.trim());
      persistSoon();
      showDetected();
    });
    item.append(el('p', { className: 'value' },
      el('label', { htmlFor: input.id }, `Candidate ${VALUE_LABELS[field].toLowerCase()} (not authoritative; you can correct it)`),
      input, detected));
  }

  const link = el('a', { href: `#p-${m.start}` }, 'Show this passage in the document');
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = $(`p-${m.start}`);
    target.scrollIntoView({ block: 'center' });
    target.focus({ preventScroll: true });
  });
  item.append(el('p', {}, link));

  const mark = el('select', { id: `m-${uid}` },
    ...Object.entries(MARKS).map(([v, label]) => el('option', { value: v, selected: (ann().mark ?? '') === v }, label)));
  mark.addEventListener('change', () => { annotate(key, { mark: mark.value }); showMark(); });
  const note = el('textarea', { id: `n-${uid}`, rows: 2, maxLength: 2000, value: ann().note ?? '' });
  note.addEventListener('input', () => annotate(key, { note: note.value }));
  const hide = el('button', { type: 'button' }, ann().hidden ? 'Unhide this result' : 'Hide this result');
  hide.addEventListener('click', () => {
    annotate(key, { hidden: !ann().hidden });
    renderCards();
    $(`card-${c.category}`).focus();
  });
  const details = el('details', { open: !!(ann().note || ann().mark) },
    el('summary', {}, 'Your mark and note'),
    el('label', { htmlFor: mark.id }, 'Was this result useful?'), mark,
    el('label', { htmlFor: note.id }, 'Your note'), note,
    el('p', { className: 'hint' }, 'Marks, notes, and corrections are yours only. They do not change the rules or the detected status.'));
  item.append(details, hide);
  return item;
}

function renderCard(c) {
  const s = STATUS[c.status];
  const card = el('article', { className: `card status-${c.status}` });
  card.setAttribute('aria-labelledby', `card-${c.category}`);
  card.append(
    el('h3', { id: `card-${c.category}`, tabIndex: -1 }, c.label),
    el('p', { className: 'status' },
      el('span', { className: 'icon', ariaHidden: 'true' }, s.icon),
      el('strong', {}, ` ${s.label}`),
      c.reviewNeeded ? el('strong', { className: 'review' }, ' ⚠ Review needed') : ''),
    el('p', {}, s.text),
  );
  for (const r of c.reviewReasons) {
    card.append(el('p', { className: 'review-reason' },
      `${r} The passages are shown below. None is treated as authoritative.`));
  }
  const isHidden = (m) => !!state.annotations[keyOf(c.category, m)]?.hidden;
  const hiddenCount = c.matches.filter(isHidden).length;
  const showing = !!state.showHidden[c.category];
  const visible = c.matches.filter((m) => showing || !isHidden(m));
  if (visible.length) {
    card.append(el('ol', { className: 'matches' }, ...visible.map((m) => renderMatch(c, m))));
  }
  if (hiddenCount) {
    const toggle = el('button', { type: 'button' }, showing ? 'Stop showing hidden results' : 'Show hidden results');
    toggle.addEventListener('click', () => {
      state.showHidden[c.category] = !showing;
      renderCards();
      $(`card-${c.category}`).focus();
    });
    card.append(el('p', { className: 'hint' },
      `${hiddenCount} result${hiddenCount === 1 ? '' : 's'} hidden by you. Hiding does not change the status above. `, toggle));
  }
  return card;
}

function renderCards() {
  $('cards').replaceChildren(...state.analysis.categories.map(renderCard));
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

/** Renders the current state. */
function show() {
  const { analysis, note } = state;
  $('extraction-note').textContent = note;
  $('extraction-note').hidden = !note;
  const stale = analysis.rulesetVersion !== RULESET_VERSION;
  $('version-note').hidden = !stale;
  $('version-text').textContent = stale
    ? `These results were produced by rule set ${analysis.rulesetVersion}. The current rule set is ${RULESET_VERSION}. Results may differ if you analyze again; notes on passages that no longer match will not be shown.`
    : '';
  const count = (st) => analysis.categories.filter((c) => c.status === st).length;
  $('summary').textContent = analysis.analyzable
    ? `${state.name}: ${count('found')} found, ${count('possible')} possible, ${count('not_found')} not found, of ${analysis.categories.length} categories.`
    : `Could not analyze: ${note ? 'no text could be read from this document.' : analysis.reason}`;
  renderCards();
  renderDocument(state.text, analysis);
  renderSaveState();
  $('results').hidden = false;
  $('document').hidden = false;
  $('results-h').focus();
}

async function run(text, name, extraction = {}) {
  const { pages, incomplete = false, note = '' } = extraction;
  if (!note) {
    const problem = validate(text);
    if (problem) return setMessage(problem);
  }
  setMessage('');
  await persistNow(); // finish saving the previous document's notes, if it was saved
  state = {
    id: null, savedAt: null, name, text, pages, incomplete, note,
    date: new Date().toISOString().slice(0, 10),
    analysis: analyzeText(text, { pages, incomplete }),
    annotations: {}, showHidden: {},
  };
  show();
}

async function discard() {
  const wasSaved = !!state?.id;
  await persistNow();
  state = null;
  $('text').value = '';
  $('file').value = '';
  $('cards').replaceChildren();
  $('doc-text').replaceChildren();
  $('results').hidden = true;
  $('document').hidden = true;
  setMessage(wasSaved ? 'Document closed. The saved copy is still on this device.' : 'Document and results discarded.');
  $('text').focus();
}

function exportReport() {
  if (!state) return;
  const blob = new Blob([buildReport(state.analysis, state)], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: 'fine-print-report.md' });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const PDF_ERRORS = {
  encrypted: 'This PDF is password-protected. This app does not open protected documents. If you have an unprotected copy, use that, or paste the text.',
  invalid: 'This file could not be read as a PDF. It may be damaged or a different kind of file.',
  too_many_pages: `This PDF has more than ${MAX_PDF_PAGES} pages. Try a shorter document or paste the relevant part.`,
  cancelled: 'Cancelled. Nothing was kept.',
  unavailable: 'The PDF reader could not be loaded. You can paste the text instead.',
};
const pageList = (nums) => (nums.length > 10 ? `${nums.slice(0, 10).join(', ')} and ${nums.length - 10} more` : nums.join(', '));
const nextPaint = () => new Promise((r) => setTimeout(r, 0));
let cancelCurrent = null;

function setProgress(text) {
  $('progress').hidden = !text;
  $('progress-text').textContent = text ?? '';
  $('analyze').disabled = $('sample').disabled = $('file').disabled = !!text;
}

async function readPdf(file) {
  if (file.size > MAX_PDF_BYTES) return setMessage('This PDF is larger than 20 MB. Try pasting the relevant part.');
  setMessage('');
  const ctrl = new AbortController();
  cancelCurrent = () => ctrl.abort();
  setProgress('Reading document…');
  let result;
  try {
    let pdfjs, extract;
    try {
      // Loaded only when a PDF is chosen, from this app's own files.
      [pdfjs, extract] = await Promise.all([
        import('../../vendor/pdfjs/pdf.min.mjs'),
        import('../pdf/extract.js'),
      ]);
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('../../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
    } catch {
      throw { code: 'unavailable' };
    }
    const data = new Uint8Array(await file.arrayBuffer());
    result = await extract.extractPdfText(pdfjs, data, {
      maxPages: MAX_PDF_PAGES,
      signal: ctrl.signal,
      onProgress: (n, total) => setProgress(`Reading document: page ${n} of ${total}`),
    });
    setProgress('Splitting into sections and checking for key terms…');
    await nextPaint();
    if (ctrl.signal.aborted) throw { code: 'cancelled' };
  } catch (e) {
    // Only a fixed message is shown; no file name or content.
    setProgress(null);
    $('file').value = '';
    return setMessage(PDF_ERRORS[e?.code] ?? PDF_ERRORS.invalid);
  } finally {
    cancelCurrent = null;
  }
  setProgress(null);

  const { text, pages, pageCount, emptyPages } = result;
  if (text.length > MAX_CHARS) return setMessage('The text in this PDF is longer than 1,000,000 characters. Try a shorter document.');
  let note = '';
  if (emptyPages.length === pageCount) {
    note = 'No text could be read from this PDF. It may be a scan or contain only images. On-device text recognition (OCR) is not available yet. If you can copy the text, paste it instead.';
  } else if (emptyPages.length) {
    note = `No text could be read from ${emptyPages.length} of ${pageCount} pages (page ${pageList(emptyPages)}). Those pages may be scans or images, and were not checked. Categories with no match are shown as “Could not analyze”.`;
  }
  $('text').value = text;
  run(text, file.name, { pages, incomplete: emptyPages.length > 0, note });
}

$('cancel').addEventListener('click', () => cancelCurrent?.());
$('version').textContent = RULESET_VERSION;
$('analyze').addEventListener('click', () => run($('text').value, 'Pasted text'));
$('sample').addEventListener('click', () => { $('text').value = SAMPLE; run(SAMPLE, 'Built-in sample'); });
$('discard').addEventListener('click', discard);
$('export').addEventListener('click', exportReport);
$('save').addEventListener('click', toggleSave);
$('delete-all').addEventListener('click', deleteAll);
$('reanalyze').addEventListener('click', reanalyze);
// Flush pending note edits if the page is being hidden or closed.
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') persistNow(); });
$('file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
  if (isPdf) return readPdf(file);
  if (!/\.txt$/i.test(file.name) && file.type !== 'text/plain') {
    return setMessage('Only PDF and plain-text (.txt) files are supported. You can paste text instead.');
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
renderSavedList();
