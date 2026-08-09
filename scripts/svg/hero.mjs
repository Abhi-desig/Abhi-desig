/**
 * Hero — the title sequence.
 *
 * Composition (1280 × 380), Swiss with an instrument layer:
 *
 *   ▪ @abhi-desig                          ⏺ LIVE · AUTO-INDEXED   ← top rail
 *   ─────────────────────────────────────────────────────────────
 *                                                REPOSITORIES
 *   ABHINAV ANIL                                       04          ← display / counter
 *   ███████████                                  PUBLIC · TRACKED
 *   CREATIVE TECHNOLOGIST
 *   Motion, interfaces, and small tools that do one thing well.
 *   ─────────────────────────────────────────────────────────────
 *   TYPESCRIPT · JAVASCRIPT · PYTHON             8 DAY STREAK ↻    ← bottom rail
 *
 * Timeline runs on a 7s master loop, authored in seconds and converted to
 * keyframe percentages by pct() — keyed like a timeline rather than doing
 * percentage arithmetic by hand.
 *
 * Technique notes, both learned the hard way:
 *  - Counter frames get *explicitly computed* keyframe windows rather than a
 *    shared animation with staggered delays. Delays would overlap adjacent
 *    frames and cross-fade them; a mechanical readout has to hard-cut.
 *  - No CSS animation of SVG geometry properties (r, width, cx). Support is
 *    uneven — Firefox in particular. Everything moves via transform/opacity/
 *    clip-path, which is universal.
 */

import { CANVAS, EASE, TIMING, pct } from './tokens.mjs';
import { layout, fitSize } from './type.mjs';
import * as S from './base.mjs';

const D = TIMING.hero;

/**
 * Values the counter ticks through on its way to the total.
 * Capped at 8 frames — the repo list grows on its own, and a profile with 40
 * repos should still tick briskly rather than counting all the way up.
 */
function tickFrames(total, max = 8) {
  if (total <= 0) return [0];
  const steps = Math.min(total, max);
  const out = [];
  for (let i = 0; i <= steps; i++) out.push(Math.round((total * i) / steps));
  return [...new Set(out)];
}

export function hero({ data, theme, fonts }) {
  const w = CANVAS.hero.w;
  const h = 380;
  const t = theme;
  const M = 64;
  const RIGHT = w - M;

  const name = (data.user.name || data.user.login).toUpperCase();
  const role = (data.user.role || '').toUpperCase();
  const tagline = data.user.tagline || '';

  // Display type sized to its column, leaving the right third for the counter.
  const size = fitSize(fonts.bold, name, {
    max: w - M * 2 - 300,
    size: 132,
    tracking: -5,
    min: 52,
  });
  const laid = layout(fonts.bold, name, { size, tracking: -5 });
  const letters = laid.glyphs
    .map((g, i) => `<path d="${g.d}" class="l" style="--i:${i}" fill="${t.type}" />`)
    .join('');

  // ── Counter ───────────────────────────────────────────────────────────────
  const values = tickFrames(data.stats.repoCount);
  const pad = String(data.stats.repoCount).length < 2 ? 2 : String(data.stats.repoCount).length;
  const TICK_START = 1.85;
  const TICK_STEP = 0.115;
  const HOLD_END = 6.2;
  const last = values.length - 1;

  const counterPaths = [];
  const counterCss = [];
  let counterW = 0;

  values.forEach((v, i) => {
    const l = layout(fonts.bold, String(v).padStart(pad, '0'), { size: 76, tracking: -2 });
    counterW = Math.max(counterW, l.width);
    const isLast = i === last;
    const from = TICK_START + TICK_STEP * i;
    const to = isLast ? HOLD_END : TICK_START + TICK_STEP * (i + 1);

    counterPaths.push(
      `<path d="${l.glyphs.map((g) => g.d).join('')}" class="cnt c${i}${isLast ? ' cnt-last' : ''}" fill="${t.type}" />`,
    );
    counterCss.push(
      `.c${i}{animation:c${i} ${D}s ${EASE.linear} infinite}
       @keyframes c${i}{
         0%,${pct(from - 0.001, D)}{opacity:0}
         ${pct(from, D)},${pct(to - 0.001, D)}{opacity:1}
         ${pct(to, D)},100%{opacity:${isLast ? 0 : 0}}
       }`,
    );
  });

  const langs = data.stats.languages
    .slice(0, 3)
    .map((l) => l.name.toUpperCase())
    .join('  ·  ');
  const streakLabel =
    data.stats.current > 0
      ? `${data.stats.current} DAY STREAK`
      : `${data.stats.contributions} CONTRIBUTIONS`;

  const roleW = S.monoWidth(role, 19, 7) + 20;

  // Measured, not guessed — see monoWidth. A fixed offset here put the live
  // indicator on top of the "I" in LIVE.
  const LIVE = 'LIVE · AUTO-INDEXED';
  const liveDotX = RIGHT - S.monoWidth(LIVE, 12, 2.4) - 13;

  const css = `
  ${S.baseCss('.cnt{opacity:0!important}.cnt-last{opacity:1!important}')}

  .gc{opacity:0;animation:gc ${D}s ${EASE.sharp} infinite;animation-delay:calc(var(--i)*28ms)}
  @keyframes gc{0%{opacity:0}6%,88%{opacity:1}97%,100%{opacity:0}}

  .rail{opacity:0;animation:fade ${D}s ${EASE.standard} infinite}
  .rail-b{opacity:0;animation:fade ${D}s ${EASE.standard} infinite;animation-delay:.12s}
  @keyframes fade{0%,2%{opacity:0}8%,90%{opacity:1}97%,100%{opacity:0}}

  .hr{transform:scaleX(0);transform-origin:${M}px 0;animation:hr ${D}s ${EASE.standard} infinite}
  @keyframes hr{0%,3%{transform:scaleX(0)}12%,90%{transform:scaleX(1)}97%,100%{transform:scaleX(0)}}

  .l{opacity:0;animation:rise ${D}s ${EASE.standard} infinite;animation-delay:calc(var(--i)*45ms)}
  @keyframes rise{
    0%,${pct(0.35, D)}{opacity:0;transform:translateY(${Math.round(size * 0.8)}px)}
    ${pct(1.05, D)},${pct(6.1, D)}{opacity:1;transform:translateY(0)}
    ${pct(6.75, D)},100%{opacity:0;transform:translateY(-14px)}
  }

  .accent-rule{transform:scaleX(0);transform-origin:${M}px 0;animation:ar ${D}s ${EASE.standard} infinite}
  @keyframes ar{
    0%,${pct(1.2, D)}{transform:scaleX(0)}
    ${pct(1.75, D)},${pct(6.2, D)}{transform:scaleX(1)}
    ${pct(6.8, D)},100%{transform:scaleX(0)}
  }

  /* Mask wipe via a clipPath rect scaled on the X axis. Scaling a clip rect is
     portable; animating its width attribute is not. */
  .roleWipe{transform:scaleX(0);transform-origin:${M}px 0;animation:rw ${D}s ${EASE.standard} infinite}
  @keyframes rw{
    0%,${pct(1.4, D)}{transform:scaleX(0)}
    ${pct(2.0, D)},${pct(6.2, D)}{transform:scaleX(1)}
    ${pct(6.8, D)},100%{transform:scaleX(0)}
  }

  .tag{opacity:0;animation:tag ${D}s ${EASE.standard} infinite}
  @keyframes tag{
    0%,${pct(1.7, D)}{opacity:0;transform:translateY(9px)}
    ${pct(2.25, D)},${pct(6.2, D)}{opacity:1;transform:translateY(0)}
    ${pct(6.8, D)},100%{opacity:0}
  }

  .cnt{opacity:0}
  ${counterCss.join('\n')}

  .pulse{transform-box:fill-box;transform-origin:center;animation:pulse 2.4s ${EASE.sharp} infinite}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.38;transform:scale(.72)}}

  /* One slow sweep during the hold, so the frame never sits perfectly still. */
  .scan{opacity:0;animation:scan ${D}s ${EASE.linear} infinite}
  @keyframes scan{
    0%,${pct(3.6, D)}{opacity:0;transform:translateX(-140px)}
    ${pct(3.95, D)}{opacity:1}
    ${pct(5.5, D)},100%{opacity:0;transform:translateX(${w + 140}px)}
  }`;

  return `${S.open({ w, h, title: `${data.user.name} — ${data.user.role}`, desc: tagline })}
${S.style(css)}
<defs>
  <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${t.accent}" stop-opacity="0" />
    <stop offset="0.5" stop-color="${t.accent}" stop-opacity="0.14" />
    <stop offset="1" stop-color="${t.accent}" stop-opacity="0" />
  </linearGradient>
  <clipPath id="roleClip">
    <rect class="roleWipe" x="${M}" y="268" width="${roleW}" height="30" />
  </clipPath>
</defs>

<rect width="${w}" height="${h}" fill="${t.ground}" />
<g>${S.gridColumns({ w, h, step: 64, color: t.grid })}</g>
<g class="scan"><rect x="-120" y="0" width="120" height="${h}" fill="url(#sweep)" /></g>

<g class="rail">
  <rect x="${M}" y="40" width="7" height="7" fill="${t.accent}" />
  ${S.mono({ x: M + 18, y: 47, text: `@${data.user.login}`, size: 12, tracking: 2.4, fill: t.muted })}
  ${S.pulseDot({ cx: liveDotX.toFixed(1), cy: 43.5, r: 3.5, color: t.accent })}
  ${S.mono({ x: RIGHT, y: 47, text: LIVE, size: 12, tracking: 2.4, fill: t.muted, anchor: 'end' })}
</g>
<g class="hr">${S.rule({ x: M, y: 68, w: w - M * 2, color: t.hairline })}</g>

<g transform="translate(${M} 214)">${letters}</g>

<g class="rail-b">
  ${S.mono({ x: RIGHT, y: 150, text: 'REPOSITORIES', size: 11, tracking: 3.4, fill: t.muted, anchor: 'end' })}
  ${S.mono({ x: RIGHT, y: 238, text: 'PUBLIC · TRACKED', size: 11, tracking: 2.6, fill: t.muted, anchor: 'end' })}
</g>
<g transform="translate(${RIGHT - counterW} 214)">${counterPaths.join('')}</g>

<g class="accent-rule"><rect x="${M}" y="242" width="248" height="4" fill="${t.accent}" /></g>
<g clip-path="url(#roleClip)">${S.mono({ x: M, y: 288, text: role, size: 19, tracking: 7, fill: t.accentText, weight: 600 })}</g>
<g class="tag">${S.mono({ x: M, y: 318, text: tagline, size: 14.5, tracking: 0.4, fill: t.muted, weight: 400 })}</g>

<g class="hr">${S.rule({ x: M, y: 340, w: w - M * 2, color: t.hairline })}</g>
<g class="rail-b">
  ${S.mono({ x: M, y: 364, text: langs, size: 11.5, tracking: 2.4, fill: t.muted })}
  ${S.mono({ x: RIGHT, y: 364, text: `${streakLabel}  ↻`, size: 11.5, tracking: 2.4, fill: t.muted, anchor: 'end' })}
</g>
${S.close()}`;
}
