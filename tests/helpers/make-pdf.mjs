// Builds tiny PDFs in memory for tests, so no binary fixtures are committed.
const esc = (s) => s.replace(/([\\()])/g, '\\$1');

function wrap(text, width) {
  const lines = [];
  for (const para of text.split('\n')) {
    if (!para.trim()) { lines.push(''); continue; }
    let line = '';
    for (const word of para.split(' ')) {
      if (line && (line + ' ' + word).length > width) { lines.push(line); line = word; }
      else line = line ? `${line} ${word}` : word;
    }
    lines.push(line);
  }
  return lines;
}

/**
 * @param {string[]} pageTexts one string per page ('' gives a page with no text)
 * @param {{width?: number, encrypted?: boolean}} opts
 * @returns {Uint8Array}
 */
export function makePdf(pageTexts, { width = 80, encrypted = false } = {}) {
  const objs = [];
  const add = (body) => { objs.push(body); return objs.length; };
  const catalog = add('');
  const pagesObj = add('');
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const kids = [];
  for (const t of pageTexts) {
    let stream = '';
    if (t) {
      let y = 760;
      stream = 'BT /F1 11 Tf\n';
      for (const line of wrap(t, width)) {
        if (line) stream += `1 0 0 1 50 ${y} Tm (${esc(line)}) Tj\n`;
        y -= 14;
      }
      stream += 'ET';
    }
    const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 612 792] ` +
      `/Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`));
  }
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objs[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
  let encrypt = 0;
  if (encrypted) {
    // Standard security handler with arbitrary keys: the empty password fails,
    // so readers must ask for a password.
    const hex = (c) => `<${c.repeat(64)}>`;
    encrypt = add(`<< /Filter /Standard /V 1 /R 2 /O ${hex('a1')} /U ${hex('b2')} /P -44 >>`);
  }

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((body, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) pdf += `${String(o).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R` +
    (encrypt ? ` /Encrypt ${encrypt} 0 R /ID [<${'0f'.repeat(16)}> <${'0f'.repeat(16)}>]` : '') +
    ` >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(pdf, 'latin1'));
}
