// Splits plain text into headings and sentence units, keeping offsets into the
// original string so every result can point back to its source.

const NUMBERED = /^(\d+(\.\d+)*[.)]|(section|article|clause|part)\s+\d+)/i;
const SENTENCE_END = /[.!?]["')\]]?\s+(?=["'(]?[A-Z0-9])/g;

function isHeading(trimmed, prevBlank, next) {
  if (trimmed.length > 60 || trimmed.split(/\s+/).length > 8) return false;
  if (/[.!?;:,]$/.test(trimmed)) return false;
  if (!prevBlank) return false;
  const allCaps = /[A-Z]/.test(trimmed) && trimmed === trimmed.toUpperCase();
  // A following line that starts in lower case is a wrapped sentence, not body text
  // under a heading (common in text extracted from PDFs).
  if (next && /^[a-z]/.test(next)) return false;
  return !!next || allCaps || NUMBERED.test(trimmed);
}

function readLines(text) {
  const lines = [];
  let pos = 0;
  while (pos <= text.length) {
    let nl = text.indexOf('\n', pos);
    if (nl === -1) nl = text.length;
    const raw = text.slice(pos, nl);
    const lead = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    lines.push({ start: pos + lead, end: pos + lead + trimmed.length, trimmed });
    pos = nl + 1;
  }
  return lines;
}

function splitSentences(text, start, end) {
  const out = [];
  const body = text.slice(start, end);
  let from = 0;
  const push = (a, b) => {
    const piece = body.slice(a, b);
    const lead = piece.length - piece.trimStart().length;
    const t = piece.trim();
    if (t) out.push({ start: start + a + lead, end: start + a + lead + t.length });
  };
  SENTENCE_END.lastIndex = 0;
  let m;
  while ((m = SENTENCE_END.exec(body))) {
    const cut = m.index + m[0].trimEnd().length;
    push(from, cut);
    from = cut;
  }
  push(from, body.length);
  return out;
}

/**
 * @returns {{sections: {heading: string|null, start: number, end: number}[],
 *            units: {start: number, end: number, text: string, section: number}[]}}
 */
export function splitText(text) {
  const lines = readLines(text);
  const sections = [{ heading: null, start: 0, end: 0 }];
  const units = [];
  let para = null;

  const flush = () => {
    if (!para) return;
    for (const s of splitSentences(text, para.start, para.end)) {
      units.push({ ...s, text: text.slice(s.start, s.end), section: sections.length - 1 });
    }
    sections[sections.length - 1].end = para.end;
    para = null;
  };

  lines.forEach((line, i) => {
    if (!line.trimmed) return flush();
    const prevBlank = i === 0 || !lines[i - 1].trimmed;
    const next = i + 1 < lines.length ? lines[i + 1].trimmed : '';
    if (isHeading(line.trimmed, prevBlank, next)) {
      flush();
      sections.push({ heading: line.trimmed, start: line.start, end: line.end });
    } else if (para) {
      para.end = line.end;
    } else {
      para = { start: line.start, end: line.end };
    }
  });
  flush();
  return { sections, units };
}
