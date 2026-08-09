/**
 * Marquee — the kinetic type ribbon.
 *
 * Tokens are pulled from the API (languages by volume, then repo topics), so
 * the ribbon re-writes itself as the work changes rather than listing a stack
 * someone typed once and forgot.
 *
 * Mechanism: the track is rendered twice, back to back, and translated by
 * exactly one track width on a linear loop. At the moment the animation
 * resets, copy B sits precisely where copy A started — so the seam is
 * mathematically invisible rather than approximately hidden.
 */

import { CANVAS, EASE, TIMING, MONO } from './tokens.mjs';
import * as S from './base.mjs';

const D = TIMING.marquee;

export function marquee({ data, theme }) {
  const w = CANVAS.marquee.w;
  const h = CANVAS.marquee.h;
  const t = theme;

  // Languages first (ranked by bytes), then topics, de-duplicated.
  const langs = data.stats.languages.slice(0, 6).map((l) => l.name.toUpperCase());
  const topics = [...new Set(data.repos.flatMap((r) => r.topics))]
    .map((s) => s.toUpperCase())
    .slice(0, 8);
  const tokens = [...new Set([...langs, ...topics])];
  if (tokens.length === 0) tokens.push('BUILDING');

  const SIZE = 15;
  const TRACK = 5.5;
  const GAP = 34;
  const charW = SIZE * 0.6;

  // Lay the track out once, measuring as we go, so we know its exact width.
  let x = 0;
  const parts = [];
  for (const token of tokens) {
    parts.push({ type: 'text', x, text: token });
    x += token.length * (charW + TRACK) + GAP;
    parts.push({ type: 'mark', x: x - GAP / 2 });
  }
  const trackW = x;

  const renderTrack = (offset) =>
    parts
      .map((p) =>
        p.type === 'text'
          ? `<text x="${(p.x + offset).toFixed(1)}" y="${h / 2 + 5}" font-family="${MONO}" font-size="${SIZE}" font-weight="500" letter-spacing="${TRACK}" fill="${t.type}" fill-opacity="0.82">${p.text}</text>`
          : `<text x="${(p.x + offset).toFixed(1)}" y="${h / 2 + 5}" font-family="${MONO}" font-size="${SIZE}" fill="${t.accent}">✦</text>`,
      )
      .join('');

  const css = `
  ${S.baseCss()}
  .track{animation:slide ${D}s ${EASE.linear} infinite}
  @keyframes slide{from{transform:translateX(0)}to{transform:translateX(-${trackW.toFixed(1)}px)}}
  `;

  return `${S.open({
    w,
    h,
    title: `Stack and topics: ${tokens.join(', ')}`,
  })}
${S.style(css)}
<defs>
  <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#fff" stop-opacity="0" />
    <stop offset="0.07" stop-color="#fff" stop-opacity="1" />
    <stop offset="0.93" stop-color="#fff" stop-opacity="1" />
    <stop offset="1" stop-color="#fff" stop-opacity="0" />
  </linearGradient>
  <mask id="fade"><rect width="${w}" height="${h}" fill="url(#edge)" /></mask>
</defs>
<rect width="${w}" height="${h}" fill="${t.ground}" />
${S.rule({ x: 0, y: 0, w, color: t.hairline })}
${S.rule({ x: 0, y: h - 1, w, color: t.hairline })}
<g mask="url(#fade)">
  <g class="track">${renderTrack(0)}${renderTrack(trackW)}</g>
</g>
${S.close()}`;
}
