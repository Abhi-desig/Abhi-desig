#!/usr/bin/env node
/**
 * Local preview harness.
 *
 * Writes a single HTML page rendering every generated asset in both themes,
 * side by side, with a replay control. This is the iteration loop for tuning
 * timing, stagger and easing — no commits, no camo cache, no waiting on a
 * workflow run.
 *
 * Assets go through <img> tags, never inline <svg>, deliberately: that is
 * exactly how GitHub embeds them, and it's the mode where scripts don't run,
 * hover doesn't fire, and external resources don't load. Inlining the markup
 * would render it more permissively than the real thing and hide those
 * failures until they showed up in production.
 *
 * The image data is base64'd into the src rather than referenced by path, so
 * the page is a single self-contained file that opens anywhere with no server.
 * A data: URI in an <img> is the same restricted rendering mode as a file path
 * in an <img>, so nothing about the test is weakened by it.
 *
 *   npm run preview
 */

import { readdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets/generated');
const TARGET = join(ROOT, 'preview.html');

if (!existsSync(OUT)) {
  console.error('No generated assets yet. Run `npm run build` first.');
  process.exit(1);
}

const files = readdirSync(OUT).filter((f) => f.endsWith('.svg'));
const pair = (base) => ({
  dark: files.find((f) => f === `${base}-dark.svg`),
  light: files.find((f) => f === `${base}-light.svg`),
});

const cards = [
  ...new Set(
    files
      .filter((f) => f.startsWith('card-'))
      .map((f) => f.replace(/-(dark|light)\.svg$/, '')),
  ),
];

let data = null;
try {
  data = JSON.parse(readFileSync(join(OUT, 'data.json'), 'utf8'));
} catch {
  /* preview still works without it */
}

const groups = [
  { name: 'Hero', bases: ['hero'], w: 1280 },
  { name: 'Marquee', bases: ['marquee'], w: 1280 },
  { name: 'Signals', bases: ['stats'], w: 1280 },
  { name: 'Project cards', bases: cards, w: 420 },
];

// The snake is produced by the workflow, so it's usually absent locally.
if (files.includes('github-snake-dark.svg')) {
  groups.push({ name: 'Snake', bases: ['github-snake'], w: 880, raw: true });
}

/** Base64 data URI, so the page stands alone with no server or relative paths. */
const dataUri = (file) =>
  `data:image/svg+xml;base64,${readFileSync(join(OUT, file)).toString('base64')}`;

const section = (g) => {
  const rows = g.bases
    .map((base) => {
      const p = g.raw
        ? { dark: 'github-snake-dark.svg', light: 'github-snake.svg' }
        : pair(base);
      const cell = (file, theme) =>
        file
          ? `<div class="cell ${theme}"><img src="${dataUri(file)}" width="${g.w}" alt="${base} ${theme}" /></div>`
          : `<div class="cell ${theme} missing">not generated</div>`;
      // Wide assets stack so each renders near 1:1; cards sit side by side,
      // which is also how they're laid out on the profile.
      const mode = g.w > 700 ? 'stack' : 'pair';
      return `<div class="row"><h3>${base}</h3><div class="${mode}">${cell(p.dark, 'dark')}${cell(p.light, 'light')}</div></div>`;
    })
    .join('');
  return `<section><h2>${g.name}</h2>${rows}</section>`;
};

const summary = data
  ? `<p class="meta">${data.repos?.length ?? 0} repos · ${data.stats?.contributions ?? 0} contributions ·
     ${data.stats?.current ?? 0} day streak · generated ${data.generatedAt?.slice(0, 19).replace('T', ' ') ?? '—'}</p>`
  : '';

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Profile motion preview</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;padding:32px 40px 96px;background:#161616;color:#e8e8e8;
       font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
  header{display:flex;align-items:baseline;gap:16px;flex-wrap:wrap;
         border-bottom:1px solid #333;padding-bottom:16px;margin-bottom:8px}
  h1{font-size:15px;letter-spacing:3px;text-transform:uppercase;margin:0;font-weight:600}
  .meta{color:#888;margin:0;font-size:12px}
  button{font:inherit;font-size:12px;letter-spacing:1px;text-transform:uppercase;
         background:#FF4D2E;color:#0A0A0A;border:0;padding:9px 16px;border-radius:2px;
         cursor:pointer;font-weight:700}
  button:hover{background:#ff6a4d}
  h2{font-size:11px;letter-spacing:3.5px;text-transform:uppercase;color:#888;
     margin:40px 0 4px;font-weight:600}
  h3{font-size:11px;letter-spacing:1.5px;color:#555;margin:20px 0 8px;font-weight:500}
  .pair{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start}
  .stack{display:grid;grid-template-columns:1fr;gap:14px;align-items:start}
  .cell{padding:14px;border-radius:3px;overflow:hidden}
  .cell.dark{background:#0A0A0A;border:1px solid #262626}
  .cell.light{background:#FAFAF8;border:1px solid #ddd}
  .cell.missing{color:#666;font-size:11px;padding:40px;text-align:center}
  img{display:block;max-width:100%;height:auto}
  .note{color:#777;font-size:11.5px;line-height:1.7;border-left:2px solid #FF4D2E;
        padding:2px 0 2px 14px;margin:12px 0 0;max-width:70ch}
</style>
</head>
<body>
<header>
  <h1>Motion preview</h1>
  ${summary}
  <button onclick="[...document.images].forEach(i=>{const s=i.src;i.src='';i.src=s})">Replay all</button>
</header>
<p class="note">
  Assets are embedded via &lt;img&gt;, the same way GitHub does it — so scripts don't run, hover
  doesn't fire, and external resources don't load. What you see here is what renders on the profile.
  Loops restart on reload, or hit Replay.
</p>
${groups.map(section).join('')}
</body>
</html>`;

writeFileSync(TARGET, html);
console.log(`→ preview.html  (${files.length} assets)`);
console.log(`  file://${TARGET}`);
