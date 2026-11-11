// Local PDF text extraction. The pdf.js library is passed in so the same code
// runs in the browser (bundled copy) and in Node tests. Nothing here performs
// network requests, and error messages never contain document text or names.

export class ExtractionError extends Error {
  /** @param {'encrypted'|'invalid'|'too_many_pages'|'cancelled'} code */
  constructor(code) {
    super(code);
    this.code = code;
  }
}

/** Rebuilds line and paragraph breaks from pdf.js text items. */
export function assembleLines(items) {
  let out = '';
  let lastY = null;
  let lastH = 0;
  for (const item of items) {
    if (typeof item.str !== 'string') continue;
    const y = item.transform?.[5] ?? 0;
    const h = item.height || lastH;
    const atLineStart = out === '' || out.endsWith('\n');
    if (item.str.trim() && atLineStart && lastY !== null && !out.endsWith('\n\n') &&
        Math.abs(lastY - y) > 1.8 * Math.max(h, lastH)) {
      out += '\n'; // a larger vertical gap is treated as a paragraph break
    }
    out += item.str;
    if (item.hasEOL) out = out.replace(/[ \t]+$/, '') + '\n';
    if (item.str.trim()) { lastY = y; lastH = h; }
  }
  return out.replace(/\s+$/, '');
}

/**
 * @param pdfjsLib the pdf.js module
 * @param {Uint8Array} data file bytes (pdf.js takes ownership of the buffer)
 * @param {{maxPages?: number, onProgress?: (page:number,total:number)=>void, signal?: AbortSignal}} opts
 * @returns {Promise<{text: string, pageCount: number, emptyPages: number[],
 *   pages: {number: number, start: number, end: number}[]}>}
 */
export async function extractPdfText(pdfjsLib, data, opts = {}) {
  const { maxPages = 300, onProgress, signal } = opts;
  const task = pdfjsLib.getDocument({
    data,
    isEvalSupported: false,
    useWorkerFetch: false,   // never fetch fonts or character maps
    disableFontFace: true,
    useSystemFonts: false,
    disableAutoFetch: true,
    disableStream: true,
    verbosity: 0,            // keep pdf.js quiet: no warnings in the console
  });
  // An empty password is never supplied and protections are never bypassed.
  task.onPassword = () => { throw new ExtractionError('encrypted'); };
  const abort = () => task.destroy();
  signal?.addEventListener('abort', abort, { once: true });

  try {
    let doc;
    try {
      doc = await task.promise;
    } catch (e) {
      if (signal?.aborted) throw new ExtractionError('cancelled');
      if (e instanceof ExtractionError) throw e;
      throw new ExtractionError(e?.name === 'PasswordException' ? 'encrypted' : 'invalid');
    }
    if (doc.numPages > maxPages) throw new ExtractionError('too_many_pages');

    let text = '';
    const pages = [];
    const emptyPages = [];
    for (let n = 1; n <= doc.numPages; n++) {
      if (signal?.aborted) throw new ExtractionError('cancelled');
      onProgress?.(n, doc.numPages);
      let pageText = '';
      try {
        const page = await doc.getPage(n);
        const content = await page.getTextContent();
        pageText = assembleLines(content.items);
        page.cleanup();
      } catch {
        if (signal?.aborted) throw new ExtractionError('cancelled');
        // An unreadable page is recorded as empty; the result is marked incomplete.
      }
      if (!pageText.trim()) emptyPages.push(n);
      if (text) text += '\n\n';
      pages.push({ number: n, start: text.length, end: text.length + pageText.length });
      text += pageText;
    }
    return { text, pages, pageCount: doc.numPages, emptyPages };
  } finally {
    signal?.removeEventListener('abort', abort);
    await task.destroy().catch(() => {});
  }
}
