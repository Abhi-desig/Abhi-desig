/**
 * Display typography — text converted to vector paths at build time.
 *
 * Why: an SVG loaded through an <img> tag cannot fetch external resources, so
 * a webfont would silently fall back to whatever the viewer happens to have.
 * Converting the display face to paths means the headline renders identically
 * for everyone, with no font loading at read time and no FOUT.
 *
 * Small metadata stays as live <text> in a system mono stack — it's set at
 * sizes where per-platform variance doesn't read, and keeping it as text makes
 * it selectable and searchable.
 */

import ot from 'opentype.js';
import { readFileSync } from 'node:fs';

const cache = new Map();

/** Parse a font once and memoize. opentype.js v2 deprecated loadSync. */
export function loadFont(path) {
  if (!cache.has(path)) cache.set(path, ot.parse(readFileSync(path)));
  return cache.get(path);
}

/**
 * Lay out a string glyph by glyph, honouring kerning plus an explicit tracking
 * value. opentype's own getPath() merges everything into one path and offers
 * no letter-spacing — we need both per-glyph paths (for stagger) and tight
 * negative tracking (for the brutalist display setting), so we lay it out here.
 *
 * Returns paths positioned on a baseline at y=0, growing right from x=0.
 *
 * @returns {{glyphs: Array<{d:string,x:number,advance:number,char:string}>, width:number, height:number}}
 */
export function layout(font, text, { size, tracking = 0 } = {}) {
  const scale = size / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);
  const chars = Array.from(text);
  const out = [];
  let x = 0;

  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];

    // Round the pen position before handing it to opentype.
    //
    // Accumulating advances and kerning in floating point leaves dust — an x
    // of 56.400000000000006 rather than 56.4 — and opentype's toPathData()
    // emits literal "NaN" into the path string for some of those values. It
    // silently corrupts one glyph: `CREATIVE` rendered with the T as a stray
    // diagonal. The accumulator below stays full-precision so nothing drifts;
    // only the emitted coordinate is rounded, well below anything visible.
    const penX = Math.round(x * 100) / 100;
    const d = g.getPath(penX, 0, size).toPathData(2);
    if (d.includes('NaN')) {
      throw new Error(`Glyph "${chars[i]}" produced an invalid path at x=${penX}`);
    }
    const advance = g.advanceWidth * scale;

    // Skip emitting a path for whitespace — it has no outline, and an empty
    // <path> still costs a DOM node and an animation slot.
    if (d && d.length > 0) {
      out.push({ d, x: penX, advance, char: chars[i] ?? '' });
    }

    let step = advance;
    if (i < glyphs.length - 1) {
      step += font.getKerningValue(g, glyphs[i + 1]) * scale;
    }
    x += step + tracking;
  }

  return {
    glyphs: out,
    width: Math.max(0, x - tracking),
    height: ((font.ascender - font.descender) * size) / font.unitsPerEm,
  };
}

/** Total advance width of a string at a given size and tracking. */
export function measure(font, text, { size, tracking = 0 } = {}) {
  return layout(font, text, { size, tracking }).width;
}

/**
 * Fit a string to a maximum width by stepping the size down. Used for repo
 * names on cards, where the string length is whatever the API hands us —
 * `Creative-Brief-Doctor` and `GitDNA` need to sit on the same grid.
 */
export function fitSize(font, text, { max, size, tracking = 0, min = 12 } = {}) {
  let s = size;
  while (s > min && measure(font, text, { size: s, tracking }) > max) s -= 1;
  return s;
}

/**
 * Merge a laid-out string into a single path `d`. Use when the text animates
 * as one block rather than letter by letter — fewer nodes, smaller file.
 */
export function flatten(laid) {
  return laid.glyphs.map((g) => g.d).join('');
}

/**
 * Wrap text to a pixel width for live <text> rendering in the mono stack.
 * Mono means every character is the same width, so we can measure by counting
 * characters against a per-character advance instead of shaping the string.
 *
 * @param {string} text
 * @param {number} maxWidth  in px
 * @param {number} fontSize  in px
 * @param {number} lines     hard cap; the last line gets an ellipsis if cut
 */
export function wrapMono(text, maxWidth, fontSize, lines = 2) {
  const charW = fontSize * 0.6; // the near-universal mono advance ratio
  const perLine = Math.max(1, Math.floor(maxWidth / charW));
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
  const out = [];
  let cur = '';

  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= perLine) {
      cur = next;
      continue;
    }
    if (cur) out.push(cur);
    cur = w;
    if (out.length === lines) break;
  }
  if (cur && out.length < lines) out.push(cur);

  // If we ran out of lines with text left over, ellipsize the final line.
  const consumed = out.join(' ').length;
  if (consumed < String(text ?? '').trim().length && out.length > 0) {
    const last = out[out.length - 1];
    out[out.length - 1] =
      last.length > perLine - 1 ? `${last.slice(0, perLine - 1)}…` : `${last}…`;
  }
  return out;
}

/**
 * Truncate on a word boundary. Repo descriptions from the API run long —
 * Gesture's is ~250 characters — and cards are set to a fixed height.
 */
export function truncate(text, max = 92) {
  const s = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[.,;:—-]$/, '')}…`;
}
