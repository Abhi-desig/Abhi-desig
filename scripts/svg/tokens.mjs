/**
 * Design tokens — the single source of truth for the whole motion system.
 *
 * Art direction: Kinetic Swiss / brutalist with a technical instrument layer.
 * Near-black ground, oversized tight-tracked display type, hairline grid,
 * mono metadata readouts, one hot accent.
 *
 * Every generator imports from here. Nothing hardcodes a colour or a duration.
 */

/** Canvas sizes. GitHub renders README content at roughly 880px wide; the
 *  wide canvases scale down cleanly, and cards sit 2-up in a table. */
export const CANVAS = {
  hero: { w: 1280, h: 360 },
  marquee: { w: 1280, h: 56 },
  card: { w: 420, h: 168 },
  stats: { w: 1280, h: 268 },
};

/**
 * Two themes, generated as separate files and wired up with
 * <picture> + prefers-color-scheme.
 *
 * `accent` is used for graphics (rules, bars, dots) where 3:1 is the bar.
 * `accentText` is the same hue darkened for small text on light grounds,
 * where 4.5:1 applies.
 */
export const THEMES = {
  dark: {
    name: 'dark',
    ground: '#0A0A0A',
    surface: '#141414',
    type: '#FAFAFA',
    muted: '#8A8A8A',
    hairline: 'rgba(250,250,250,0.11)',
    grid: 'rgba(250,250,250,0.055)',
    chip: 'rgba(250,250,250,0.07)',
    accent: '#FF4D2E',
    accentText: '#FF6A4D',
  },
  light: {
    name: 'light',
    ground: '#FAFAF8',
    surface: '#FFFFFF',
    type: '#0A0A0A',
    muted: '#5F5F5F',
    hairline: 'rgba(10,10,10,0.14)',
    grid: 'rgba(10,10,10,0.06)',
    chip: 'rgba(10,10,10,0.05)',
    accent: '#E8380F',
    accentText: '#C42B08',
  },
};

/** Easing curves. `standard` is the workhorse — a strong decelerate that
 *  makes type feel like it lands rather than drifts. */
export const EASE = {
  standard: 'cubic-bezier(.22,1,.36,1)',
  sharp: 'cubic-bezier(.4,0,.2,1)',
  linear: 'linear',
};

/** Mono stack for metadata. System fonts only — SVG loaded via <img> cannot
 *  fetch a webfont, so anything not converted to paths must resolve locally. */
export const MONO =
  "ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

/**
 * Master loop durations, in seconds.
 *
 * Everything loops rather than playing once. GitHub lazy-loads images, so a
 * one-shot intro will often have finished before it scrolls into view and
 * leaves a dead frame. Each asset runs on one shared clock with per-element
 * animation-delay for stagger, so the phase relationship holds forever.
 */
export const TIMING = {
  hero: 7,
  marquee: 22,
  card: 6,
  stats: 7,
};

/** Baseline grid. All vertical rhythm is a multiple of 8. */
export const GRID = 8;

/** Fallback accents for languages GitHub has no colour for. */
export const FALLBACK_ACCENT = '#FF4D2E';

/**
 * Convert an absolute time (seconds) into a keyframe percentage for a given
 * master loop. Generators use this so timelines can be authored in seconds —
 * the way you'd actually write them in After Effects — rather than percentages.
 */
export function pct(seconds, duration) {
  return `${((seconds / duration) * 100).toFixed(3)}%`;
}

/** XML-escape a string for safe embedding in SVG text nodes and attributes. */
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
