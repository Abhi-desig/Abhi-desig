/**
 * Shared SVG primitives.
 *
 * Everything an asset needs that isn't specific to one composition: the
 * document shell, the mono text setter, hairlines, and the background grid.
 *
 * Note on animation technique: motion is CSS `@keyframes` inside a <style>
 * block rather than SMIL. Both render in an <img>-embedded SVG, but CSS lets
 * every element hang off one shared master clock, so a per-element
 * `animation-delay` produces a permanent phase offset — which is exactly what
 * stagger is — instead of drifting out of sync across loops.
 */

import { MONO, esc } from './tokens.mjs';

/** Document shell. `title`/`desc` are read by screen readers when the SVG is
 *  linked directly; the README's alt text covers the <img> case. */
export function open({ w, h, title, desc = '' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>${desc ? `\n<desc>${esc(desc)}</desc>` : ''}`;
}

export const close = () => '</svg>';

export const style = (css) => `<style>${css}</style>`;

/**
 * Mono metadata text. Left as live <text> rather than converted to paths —
 * at these sizes the per-platform variance in a system mono stack doesn't
 * read, and keeping it as text makes it selectable and searchable.
 */
export function mono({
  x,
  y,
  text,
  size = 12,
  tracking = 2,
  fill,
  opacity = 1,
  anchor = 'start',
  weight = 500,
  cls = '',
}) {
  return `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" font-weight="${weight}" letter-spacing="${tracking}" fill="${fill}" fill-opacity="${opacity}" text-anchor="${anchor}"${cls ? ` class="${cls}"` : ''} xml:space="preserve">${esc(text)}</text>`;
}

/**
 * Approximate rendered width of a mono string.
 *
 * Every character in a monospace face has the same advance — near-universally
 * 0.6em — so width is just a character count, no shaping required. Use this to
 * place anything that sits beside right-aligned text: hardcoding an offset
 * works for one string and collides the moment the content changes, which is
 * guaranteed here because the content comes from an API.
 */
export function monoWidth(text, size, tracking = 0) {
  return String(text ?? '').length * (size * 0.6 + tracking);
}

/** A 1px rule. Rendered at a half-pixel offset so it stays crisp rather than
 *  smearing across two device pixels. */
export function rule({ x, y, w, color, cls = '', h = 1 }) {
  return `<rect x="${x}" y="${Math.round(y) + 0.5}" width="${w}" height="${h}" fill="${color}"${cls ? ` class="${cls}"` : ''} />`;
}

/**
 * The technical ground: evenly spaced vertical hairlines.
 * Each column carries an index so it can be staggered on the way in.
 */
export function gridColumns({ w, h, step = 64, color, cls = 'gc', from = 0 }) {
  const out = [];
  let i = 0;
  for (let x = from; x <= w; x += step) {
    out.push(
      `<line x1="${x + 0.5}" y1="0" x2="${x + 0.5}" y2="${h}" stroke="${color}" stroke-width="1" class="${cls}" style="--i:${i}" />`,
    );
    i++;
  }
  return out.join('');
}

/** Crosshair tick, the small registration mark used at composition corners. */
export function tick({ x, y, size = 7, color, cls = '' }) {
  return `<g class="${cls}" stroke="${color}" stroke-width="1"><line x1="${x - size}" y1="${y + 0.5}" x2="${x + size}" y2="${y + 0.5}" /><line x1="${x + 0.5}" y1="${y - size}" x2="${x + 0.5}" y2="${y + size}" /></g>`;
}

/**
 * A filled dot that breathes. Used as the "live" indicator in the top rail —
 * it's the one element that never stops moving, so the composition reads as
 * active even during the long hold.
 */
export function pulseDot({ cx, cy, r = 3.5, color, cls = 'pulse' }) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" class="${cls}" />`;
}

/**
 * Baseline CSS every asset shares.
 *
 * The reduced-motion block resolves every element to its *finished* state:
 * animations off, nothing mid-transform, everything visible. That's right for
 * elements that animate in — but wrong for any element that is only visible
 * during part of the loop, like the counter's intermediate digit frames, which
 * would otherwise all stack on top of each other. Pass `extraReduced` to
 * re-hide those.
 */
export function baseCss(extraReduced = '') {
  return `
    text{dominant-baseline:auto}
    @media (prefers-reduced-motion:reduce){
      *{animation:none!important;opacity:1!important;transform:none!important}
      ${extraReduced}
    }
  `;
}
