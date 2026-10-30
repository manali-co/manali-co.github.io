/* Which characters a TrueType font draws: its cmap (formats 4 and 12, the two every modern font
   carries). The link preview image keeps only characters its own fonts draw, because next/og
   fetches any glyph its fonts lack from Google Fonts with the text itself in the URL, and a
   preview's text is a person's name and note. */
export function cmapCodepoints(font: Uint8Array): Set<number> {
  const v = new DataView(font.buffer, font.byteOffset, font.byteLength);
  const tables = v.getUint16(4);
  let cmap = -1;
  for (let i = 0; i < tables; i++) {
    const rec = 12 + i * 16;
    if (String.fromCharCode(font[rec], font[rec + 1], font[rec + 2], font[rec + 3]) === "cmap") cmap = v.getUint32(rec + 8);
  }
  const out = new Set<number>();
  if (cmap < 0) return out;
  const n = v.getUint16(cmap + 2);
  for (let i = 0; i < n; i++) {
    const sub = cmap + v.getUint32(cmap + 4 + i * 8 + 4);
    const format = v.getUint16(sub);
    if (format === 4) {
      const segX2 = v.getUint16(sub + 6);
      const ends = sub + 14, starts = ends + segX2 + 2, deltas = starts + segX2, offsets = deltas + segX2;
      for (let s = 0; s < segX2; s += 2) {
        const end = v.getUint16(ends + s), start = v.getUint16(starts + s), delta = v.getInt16(deltas + s), ro = v.getUint16(offsets + s);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          const glyph = ro === 0 ? (c + delta) & 0xffff : (() => {
            const g = v.getUint16(offsets + s + ro + (c - start) * 2);
            return g === 0 ? 0 : (g + delta) & 0xffff;
          })();
          if (glyph) out.add(c);
        }
      }
    } else if (format === 12) {
      const groups = v.getUint32(sub + 12);
      for (let g = 0; g < groups; g++) {
        const rec = sub + 16 + g * 12;
        const start = v.getUint32(rec), end = v.getUint32(rec + 4), first = v.getUint32(rec + 8);
        for (let c = start; c <= end; c++) if (first + (c - start)) out.add(c);
      }
    }
  }
  return out;
}

/** The text with only the characters `drawn` holds (spaces kept), whitespace collapsed. */
export function keepDrawn(text: string, drawn: Set<number>): string {
  return Array.from(text).filter((ch) => /\s/.test(ch) || drawn.has(ch.codePointAt(0) as number)).join("").replace(/\s+/g, " ").trim();
}
