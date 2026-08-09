/**
 * Project card — one per repo, generated from API data.
 *
 * This is the piece that makes the profile self-maintaining: push a new public
 * repo and a card for it appears on the next refresh, art-directed identically
 * to the rest, with no hand-editing.
 *
 * Each card is a standalone SVG so it can be wrapped in its own <a> in the
 * README. That's forced by GitHub stripping <map>/<area>, which rules out
 * hotspotting one large image — and it turns out better anyway, since cards
 * reflow in a table instead of scaling as one fixed block.
 *
 * Composition (420 × 168):
 *
 *   ┃ GESTURE                          ● JAVASCRIPT
 *   ┃ Your hands drive macOS. MediaPipe
 *   ┃ watches, Swift presses the keys.
 *   ┃
 *   ┃ MEDIAPIPE  MACOS                 ↗ OPEN · LIVE
 *
 * The left bar takes the repo's GitHub language colour, so the grid is
 * colour-coded by stack automatically and stays legible as it grows.
 */

import { CANVAS, EASE, TIMING, FALLBACK_ACCENT, pct } from './tokens.mjs';
import { layout, fitSize, wrapMono } from './type.mjs';
import * as S from './base.mjs';

const D = TIMING.card;

export function card({ repo, index = 0, theme, fonts }) {
  const w = CANVAS.card.w;
  const h = CANVAS.card.h;
  const t = theme;
  const PAD = 22;
  const BAR = 4;
  const accent = repo.languageColor || t.accent || FALLBACK_ACCENT;

  // The language label is right-aligned and its width varies with the language
  // name, so the title's budget is measured back from where that label actually
  // starts rather than from a fixed guess. With a constant, `TYPESCRIPT` sat
  // hard against `CREATIVE-BRIEF-DOCTOR` while `PYTHON` left a gap.
  const LANG_SIZE = 10;
  const LANG_TRACK = 1.4;
  const lang = (repo.language || '—').toUpperCase();
  const langW = lang.length * (LANG_SIZE * 0.6 + LANG_TRACK);
  const dotX = w - PAD - langW - 13;
  const titleX = PAD + BAR + 10;

  const title = repo.displayName.toUpperCase();
  const size = fitSize(fonts.bold, title, {
    max: dotX - 5 - 14 - titleX,
    size: 27,
    tracking: -0.9,
    min: 13,
  });
  const laid = layout(fonts.bold, title, { size, tracking: -0.9 });
  const letters = laid.glyphs
    .map((g, i) => `<path d="${g.d}" class="cl" style="--i:${i}" fill="${t.type}" />`)
    .join('');

  const lines = wrapMono(repo.blurb, w - PAD * 2 - 8, 12, 2);
  const blurb = lines
    .map(
      (line, i) =>
        S.mono({
          x: titleX,
          y: 92 + i * 17,
          text: line,
          size: 12,
          tracking: 0.1,
          fill: t.muted,
          weight: 400,
          cls: 'cb',
        }).replace('<text ', `<text style="--i:${i}" `),
    )
    .join('');

  // Topic chips, capped at what fits the row without crowding the CTA.
  const chips = [];
  let cx = titleX;
  for (const topic of repo.topics.slice(0, 3)) {
    const label = topic.toUpperCase();
    const cw = label.length * 6.1 + 16;
    if (cx + cw > w - 118) break;
    chips.push(
      `<g class="cc" style="--i:${chips.length}"><rect x="${cx}" y="${h - 42}" width="${cw.toFixed(1)}" height="19" rx="2" fill="${t.chip}" />${S.mono(
        { x: cx + 8, y: h - 28.5, text: label, size: 9.5, tracking: 1.1, fill: t.muted, weight: 500 },
      )}</g>`,
    );
    cx += cw + 7;
  }

  // The CTA names where the click actually lands, and the grid wires the link
  // to match: LIVE → the deployment, REPO → the source. Keeping the last token
  // the destination means the card never advertises somewhere it doesn't go.
  const cta = `${[repo.stars > 0 ? `★ ${repo.stars}` : '', repo.live ? 'LIVE' : 'REPO']
    .filter(Boolean)
    .join('  ·  ')}  ↗`;

  const css = `
  ${S.baseCss()}
  .bar{transform-origin:0 ${h}px;animation:bar ${D}s ${EASE.standard} infinite backwards;animation-delay:${(index * 0.12).toFixed(2)}s}
  @keyframes bar{
    0%,4%{transform:scaleY(0)}
    16%,88%{transform:scaleY(1)}
    97%,100%{transform:scaleY(0)}
  }

  .frame{animation:fr ${D}s ${EASE.standard} infinite backwards;animation-delay:${(index * 0.12).toFixed(2)}s}
  @keyframes fr{0%,2%{opacity:0}14%,90%{opacity:1}98%,100%{opacity:0}}

  .cl{animation:cl ${D}s ${EASE.standard} infinite backwards;animation-delay:calc(${(index * 0.12).toFixed(2)}s + var(--i)*22ms)}
  @keyframes cl{
    0%,${pct(0.28, D)}{opacity:0;transform:translateY(14px)}
    ${pct(0.85, D)},${pct(5.2, D)}{opacity:1;transform:translateY(0)}
    ${pct(5.75, D)},100%{opacity:0}
  }

  .cb{animation:cb ${D}s ${EASE.standard} infinite backwards;animation-delay:calc(${(index * 0.12).toFixed(2)}s + var(--i)*80ms)}
  @keyframes cb{
    0%,${pct(0.7, D)}{opacity:0;transform:translateY(7px)}
    ${pct(1.2, D)},${pct(5.2, D)}{opacity:1;transform:translateY(0)}
    ${pct(5.75, D)},100%{opacity:0}
  }

  .cc{animation:cc ${D}s ${EASE.standard} infinite backwards;animation-delay:calc(${(index * 0.12).toFixed(2)}s + var(--i)*70ms)}
  @keyframes cc{
    0%,${pct(1.1, D)}{opacity:0;transform:translateY(6px)}
    ${pct(1.6, D)},${pct(5.2, D)}{opacity:1;transform:translateY(0)}
    ${pct(5.75, D)},100%{opacity:0}
  }

  /* The bar keeps a slow breath through the hold so the grid never dies. */
  .glow{transform-box:fill-box;transform-origin:center;animation:glow 3.2s ${EASE.sharp} infinite backwards}
  @keyframes glow{0%,100%{opacity:.95}50%{opacity:.45}}

  .dot{transform-box:fill-box;transform-origin:center;animation:dot 3.2s ${EASE.sharp} infinite backwards}
  @keyframes dot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.76);opacity:.55}}
  `;

  return `${S.open({
    w,
    h,
    title: `${repo.displayName} — ${repo.language || 'project'}`,
    desc: repo.blurb,
  })}
${S.style(css)}
<rect width="${w}" height="${h}" fill="${t.ground}" />
<g class="frame"><rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="3" stroke="${t.hairline}" fill="none" /></g>
<g class="bar"><rect x="0" y="0" width="${BAR}" height="${h}" fill="${accent}" class="glow" /></g>

<g transform="translate(${titleX} 56)">${letters}</g>

<g class="frame">
  <circle cx="${dotX.toFixed(1)}" cy="50" r="4" fill="${accent}" class="dot" />
  ${S.mono({ x: w - PAD, y: 54, text: lang, size: LANG_SIZE, tracking: LANG_TRACK, fill: t.muted, anchor: 'end' })}
</g>

${blurb}
${chips.join('')}

<g class="frame">
  ${S.mono({ x: w - PAD, y: h - 28.5, text: cta, size: 10.5, tracking: 1.5, fill: t.accentText, weight: 600, anchor: 'end' })}
</g>
${S.close()}`;
}
