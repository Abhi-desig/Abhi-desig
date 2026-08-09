/**
 * Signals panel.
 *
 * This exists to retire two dependencies the old README carried: a
 * `github-readme-stats` hotlink and a streak counter pointed at a
 * `herokuapp.com` endpoint that no longer resolves. Both numbers are already
 * in the GraphQL payload or derivable from it, so rendering them here removes
 * the third party rather than swapping it for a different one that can also
 * disappear.
 *
 * Composition (1280 × 268):
 *
 *   ▪ SIGNALS                        SELF-COMPUTED · NO THIRD PARTY
 *   ────────────────────────────────────────────────────────────────
 *   CONTRIBUTIONS   COMMITS      CURRENT STREAK   PUBLIC REPOS
 *   75              59           8                4
 *   ────────────────────────────────────────────────────────────────
 *   ████████████████████░░░░░░░░░░░░░░░░░░░░░░░  ← language split
 *   ● TYPESCRIPT 65.9%   ● JAVASCRIPT 20.1%   ● PYTHON 4.5%
 *
 * No contribution sparkline here on purpose — the snake directly below already
 * shows the calendar, and drawing it twice would be decoration rather than
 * information.
 */

import { CANVAS, EASE, TIMING, pct } from './tokens.mjs';
import { layout } from './type.mjs';
import * as S from './base.mjs';

const D = TIMING.stats;

export function stats({ data, theme, fonts }) {
  const w = CANVAS.stats.w;
  const h = CANVAS.stats.h;
  const t = theme;
  const M = 64;
  const RIGHT = w - M;
  const s = data.stats;

  const cells = [
    { label: 'CONTRIBUTIONS', value: s.contributions },
    { label: 'COMMITS', value: s.commits },
    { label: 'CURRENT STREAK', value: s.current },
    { label: 'PUBLIC REPOS', value: s.repoCount },
  ];

  const colW = (w - M * 2) / cells.length;

  // Two nested groups, deliberately. A CSS `transform` animation overrides the
  // `transform` presentation attribute entirely rather than composing with it —
  // so animating translateY on the positioned group would discard its
  // translate() and stamp every number at the origin, off-canvas. The outer
  // group positions, the inner group animates, and neither fights the other.
  const numbers = cells
    .map((c, i) => {
      const laid = layout(fonts.bold, String(c.value), { size: 52, tracking: -1.5 });
      const paths = laid.glyphs.map((g) => `<path d="${g.d}" fill="${t.type}" />`).join('');
      return `<g transform="translate(${M + colW * i} 158)"><g class="num" style="--i:${i}">${paths}</g></g>`;
    })
    .join('');

  const labels = cells
    .map((c, i) =>
      S.mono({
        x: M + colW * i,
        y: 104,
        text: c.label,
        size: 10.5,
        tracking: 3.2,
        fill: t.muted,
        cls: 'lab',
      }).replace('<text ', `<text style="--i:${i}" `),
    )
    .join('');

  // ── Language split ────────────────────────────────────────────────────────
  // Anything under 3% is folded into "OTHER" so the bar stays readable rather
  // than becoming a row of one-pixel slivers.
  const BAR_W = w - M * 2;
  const major = s.languages.filter((l) => l.pct >= 3);
  const minorPct = s.languages.filter((l) => l.pct < 3).reduce((a, l) => a + l.pct, 0);
  const split = minorPct > 0 ? [...major, { name: 'OTHER', pct: minorPct, color: t.muted }] : major;

  let ox = M;
  const segments = split
    .map((l, i) => {
      const segW = (l.pct / 100) * BAR_W;
      const rect = `<rect x="${ox.toFixed(1)}" y="210" width="${Math.max(segW - 2, 1).toFixed(1)}" height="14" fill="${l.color || t.muted}" class="seg" style="--i:${i};transform-origin:${ox.toFixed(1)}px 0" />`;
      ox += segW;
      return rect;
    })
    .join('');

  let lx = M;
  const legend = split
    .slice(0, 5)
    .map((l, i) => {
      const label = `${l.name.toUpperCase()} ${l.pct.toFixed(1)}%`;
      const g = `<g class="leg" style="--i:${i}"><circle cx="${lx + 4}" cy="${246 - 4}" r="4" fill="${l.color || t.muted}" />${S.mono(
        { x: lx + 15, y: 246, text: label, size: 10.5, tracking: 1.4, fill: t.muted },
      )}</g>`;
      lx += label.length * 7.1 + 42;
      return g;
    })
    .join('');

  const updated = `SELF-COMPUTED · ${data.generatedAt.slice(0, 10)}`;
  const updatedDotX = RIGHT - S.monoWidth(updated, 11.5, 2.2) - 13;

  const css = `
  ${S.baseCss()}
  .rail{opacity:0;animation:fade ${D}s ${EASE.standard} infinite}
  @keyframes fade{0%,2%{opacity:0}9%,90%{opacity:1}97%,100%{opacity:0}}

  .hr{transform:scaleX(0);transform-origin:${M}px 0;animation:hr ${D}s ${EASE.standard} infinite}
  @keyframes hr{0%,3%{transform:scaleX(0)}13%,90%{transform:scaleX(1)}97%,100%{transform:scaleX(0)}}

  .lab{opacity:0;animation:lab ${D}s ${EASE.standard} infinite;animation-delay:calc(var(--i)*70ms)}
  @keyframes lab{0%,5%{opacity:0}14%,90%{opacity:1}97%,100%{opacity:0}}

  .num{opacity:0;animation:num ${D}s ${EASE.standard} infinite;animation-delay:calc(var(--i)*90ms)}
  @keyframes num{
    0%,${pct(0.5, D)}{opacity:0;transform:translateY(20px)}
    ${pct(1.15, D)},${pct(6.2, D)}{opacity:1;transform:translateY(0)}
    ${pct(6.8, D)},100%{opacity:0}
  }

  .seg{transform:scaleX(0);animation:seg ${D}s ${EASE.standard} infinite;animation-delay:calc(var(--i)*85ms)}
  @keyframes seg{
    0%,${pct(1.3, D)}{transform:scaleX(0)}
    ${pct(2.1, D)},${pct(6.2, D)}{transform:scaleX(1)}
    ${pct(6.8, D)},100%{transform:scaleX(0)}
  }

  .leg{opacity:0;animation:leg ${D}s ${EASE.standard} infinite;animation-delay:calc(var(--i)*75ms)}
  @keyframes leg{
    0%,${pct(1.9, D)}{opacity:0;transform:translateY(6px)}
    ${pct(2.45, D)},${pct(6.2, D)}{opacity:1;transform:translateY(0)}
    ${pct(6.8, D)},100%{opacity:0}
  }

  .pulse{transform-box:fill-box;transform-origin:center;animation:pulse 2.4s ${EASE.sharp} infinite}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.38;transform:scale(.72)}}
  `;

  return `${S.open({
    w,
    h,
    title: `Signals — ${s.contributions} contributions, ${s.current} day streak, ${s.repoCount} public repos`,
    desc: `Language split: ${split.map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(', ')}`,
  })}
${S.style(css)}
<rect width="${w}" height="${h}" fill="${t.ground}" />
<g>${S.gridColumns({ w, h, step: 64, color: t.grid })}</g>

<g class="rail">
  <rect x="${M}" y="40" width="7" height="7" fill="${t.accent}" />
  ${S.mono({ x: M + 18, y: 47, text: 'SIGNALS', size: 12, tracking: 3, fill: t.muted })}
  ${S.pulseDot({ cx: updatedDotX.toFixed(1), cy: 43.5, r: 3.5, color: t.accent })}
  ${S.mono({ x: RIGHT, y: 47, text: updated, size: 11.5, tracking: 2.2, fill: t.muted, anchor: 'end' })}
</g>
<g class="hr">${S.rule({ x: M, y: 68, w: w - M * 2, color: t.hairline })}</g>

${labels}
${numbers}

<g class="hr">${S.rule({ x: M, y: 188, w: w - M * 2, color: t.hairline })}</g>
${segments}
${legend}
${S.close()}`;
}
