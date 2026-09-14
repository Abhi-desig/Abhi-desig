/**
 * README assembly.
 *
 * Generated regions are bounded by HTML comment markers; everything between
 * them is replaced wholesale, and everything outside them is left alone. That
 * split matters — the prose is hand-owned and shouldn't be at the mercy of a
 * cron job, while the project grid must never be edited by hand or it will
 * drift from the API.
 *
 * ── On cache busting ──────────────────────────────────────────────────────
 * GitHub serves README images through its camo proxy, which caches
 * aggressively. A regenerated SVG at an unchanged URL can keep serving the old
 * bytes for hours. So every asset is referenced by absolute raw URL with a
 * `?v=<content-hash>` suffix: identical content keeps its URL (no pointless
 * cache churn), changed content gets a new one and is fetched immediately.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const RAW = 'https://raw.githubusercontent.com';

/** Short content hash — enough to be unique per revision, short enough to read. */
export function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 10);
}

/** Absolute, cache-busted URL for a generated asset. */
export function assetUrl({ repoPath, branch, file, hash }) {
  return `${RAW}/${repoPath}/${branch}/${file}?v=${hash}`;
}

/**
 * A theme-aware image. GitHub honours <picture> with prefers-color-scheme, so
 * each asset ships light and dark variants and switches with the site theme
 * rather than compromising on one palette that works badly in both.
 */
export function picture({ dark, light, alt, width = '100%', inline = false }) {
  const parts = [
    `<source media="(prefers-color-scheme: dark)" srcset="${dark}" />`,
    `<source media="(prefers-color-scheme: light)" srcset="${light}" />`,
    `<img alt="${alt}" src="${dark}" width="${width}" />`,
  ];

  // Inside a table cell the whole thing must be a single line.
  //
  // GitHub's markdown parser ends an HTML block at a blank line and resumes
  // parsing markdown, which splits a multi-line <picture> at its newlines and
  // ejects <source>/<img> out of it. The result is quietly catastrophic: the
  // wrapping <a> is left around an empty <picture> (so the link is a dead
  // 76×19 box), the orphaned <img> gets auto-linked by GitHub to the raw image
  // file, and theme switching dies because the <source> tags are gone.
  // Everything still *looks* fine, which is why it needs a comment.
  if (inline) return `<picture>${parts.join('')}</picture>`;

  return `<picture>\n  ${parts.join('\n  ')}\n</picture>`;
}

/**
 * Replace the content between `<!-- NAME:START -->` and `<!-- NAME:END -->`.
 * Throws rather than silently appending if the markers are missing — a silent
 * no-op here would mean the profile quietly stops updating and nobody notices.
 */
export function replaceRegion(source, name, content) {
  const start = `<!-- ${name}:START -->`;
  const end = `<!-- ${name}:END -->`;
  const re = new RegExp(
    `${start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
  );
  if (!re.test(source)) {
    throw new Error(`README is missing the ${name} markers — nothing was written.`);
  }
  return source.replace(re, `${start}\n${content}\n${end}`);
}

/**
 * The project grid: a 2-up table of individually clickable animated cards.
 *
 * A table rather than a flex row because GitHub's markdown sanitiser strips
 * style attributes, so a table is the only layout primitive that survives —
 * and it reflows to a single column on narrow viewports, which a fixed-width
 * image row would not.
 */
export function projectGrid(repos, urlFor) {
  if (repos.length === 0) {
    return '_No public repositories yet._';
  }

  const cell = (repo) => {
    // The thumbnail goes to the project itself — the deployed thing when there
    // is one, the repository otherwise. Sending a card that reads "↗ LIVE" to a
    // source tree is a small lie, and it's the click most people want anyway.
    // The repo is always one click away in the full index below.
    const href = repo.live || repo.url;
    const dest = repo.live ? 'opens the live site' : 'opens the repository';
    const img = picture({
      dark: urlFor(repo, 'dark'),
      light: urlFor(repo, 'light'),
      alt: `${repo.displayName} — ${repo.blurb} (${dest})`,
      width: '420',
      inline: true,
    });
    // One line, no blank lines — see picture() for why this is load-bearing.
    return `<td width="50%" valign="top"><a href="${href}">${img}</a></td>`;
  };

  const rows = [];
  for (let i = 0; i < repos.length; i += 2) {
    const pair = repos.slice(i, i + 2).map(cell);
    // Pad the final odd row so the table doesn't collapse to full width.
    if (pair.length === 1) pair.push('<td width="50%"></td>');
    rows.push(`<tr>${pair.join('')}</tr>`);
  }

  return `<table>\n${rows.join('\n')}\n</table>`;
}

/**
 * Contact row, built only from links that are actually filled in.
 *
 * The README this replaces shipped three unedited placeholders — `YOUR-HANDLE`
 * twice and `your@email.com` — live on the profile. Generating the row from
 * config means an empty value renders nothing at all, so that failure mode
 * can't recur: the row is either correct or absent.
 */
export function contactRow(links = {}, data) {
  const defs = [
    { key: 'portfolio', label: 'Portfolio', href: (v) => v },
    { key: 'linkedin', label: 'LinkedIn', href: (v) => (v.startsWith('http') ? v : `https://linkedin.com/in/${v}`) },
    { key: 'behance', label: 'Behance', href: (v) => (v.startsWith('http') ? v : `https://behance.net/${v}`) },
    { key: 'x', label: 'X', href: (v) => (v.startsWith('http') ? v : `https://x.com/${v.replace(/^@/, '')}`) },
    { key: 'instagram', label: 'Instagram', href: (v) => (v.startsWith('http') ? v : `https://instagram.com/${v.replace(/^@/, '')}`) },
    { key: 'email', label: 'Email', href: (v) => (v.startsWith('mailto:') ? v : `mailto:${v}`) },
  ];

  const out = defs
    .filter((d) => (links[d.key] ?? '').trim())
    .map((d) => `[**${d.label}**](${d.href(links[d.key].trim())})`);

  out.push(`[**GitHub**](https://github.com/${data.user.login})`);
  return out.join(' · ');
}

/**
 * Plain-text index of every repo.
 *
 * Doubles as the accessible fallback for the card grid — it is real markdown,
 * so it works with images disabled, in feed readers, and for anyone who wants
 * to read rather than look. Live links surface here too.
 */
export function projectTable(repos) {
  const head = '| Project | What it does | Stack | |\n|---|---|---|---|';
  const rows = repos.map((r) => {
    const live = r.live ? ` · [live ↗](${r.live})` : '';
    const stars = r.stars > 0 ? ` ★${r.stars}` : '';
    const desc = (r.description || r.blurb).replace(/\|/g, '\\|');
    return `| [**${r.displayName}**](${r.url}) | ${desc} | \`${r.language || '—'}\`${stars} | [repo ↗](${r.url})${live} |`;
  });
  return [head, ...rows].join('\n');
}
