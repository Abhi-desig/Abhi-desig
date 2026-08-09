/**
 * Data layer — one GraphQL round trip for everything the page needs.
 *
 * REST would take four or five calls (repos, then languages and topics per
 * repo, then the contribution calendar). GraphQL gets it in one, which keeps
 * the Action fast and well clear of rate limits.
 *
 * Auth is the workflow's built-in GITHUB_TOKEN — no PAT to create, rotate, or
 * leak. The one thing that buys us less of is private contribution counts; see
 * the note on `contributionsCollection` below.
 */

import { truncate } from './svg/type.mjs';

const ENDPOINT = 'https://api.github.com/graphql';

const QUERY = `
query($login: String!) {
  user(login: $login) {
    name
    login
    bio
    avatarUrl
    createdAt
    followers { totalCount }
    repositories(
      first: 100
      ownerAffiliations: OWNER
      privacy: PUBLIC
      isFork: false
      orderBy: { field: PUSHED_AT, direction: DESC }
    ) {
      totalCount
      nodes {
        name
        description
        url
        homepageUrl
        stargazerCount
        forkCount
        isArchived
        isPrivate
        pushedAt
        primaryLanguage { name color }
        languages(first: 6, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
        repositoryTopics(first: 8) { nodes { topic { name } } }
      }
    }
    contributionsCollection {
      totalCommitContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

async function graphql(token, variables) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'abhi-desig-profile-builder',
    },
    body: JSON.stringify({ query: QUERY, variables }),
  });

  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`GraphQL: ${json.errors.map((e) => e.message).join('; ')}`);
  }
  if (!json.data?.user) throw new Error(`No such user: ${variables.login}`);
  return json.data;
}

/**
 * Current and longest contribution streaks, computed from the calendar.
 *
 * This is the piece that retires the dead streak-stats Heroku endpoint the old
 * README pointed at. Swapping in another free host would just move the problem;
 * deriving it from data we already fetched removes the dependency entirely.
 *
 * Today is excluded from breaking a streak — a day with no commits yet is only
 * a gap once it's over, otherwise every streak would read zero each morning.
 */
export function streaks(days) {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0;
  let run = 0;

  for (const d of sorted) {
    if (d.contributionCount > 0) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  let current = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const d = sorted[i];
    if (d.contributionCount > 0) {
      current += 1;
      continue;
    }
    // Allow exactly one trailing empty day (today, still in progress).
    if (i === sorted.length - 1) continue;
    break;
  }

  return { current, longest };
}

/**
 * Aggregate language bytes across every repo, as percentages.
 * Operates on the normalised repo shape (flat `languages` array), not the raw
 * GraphQL edge shape.
 */
function languageSplit(repos) {
  const totals = new Map();
  for (const r of repos) {
    for (const l of r.languages ?? []) {
      const prev = totals.get(l.name) ?? { size: 0, color: l.color };
      totals.set(l.name, { size: prev.size + l.size, color: l.color });
    }
  }
  const grand = [...totals.values()].reduce((a, b) => a + b.size, 0) || 1;
  return [...totals.entries()]
    .map(([name, v]) => ({ name, size: v.size, color: v.color, pct: (v.size / grand) * 100 }))
    .sort((a, b) => b.size - a.size);
}

/**
 * A card always needs a line of copy. Repos without a description fall back
 * through topics, then language, then a neutral line — better than a blank
 * card, and it means a brand-new repo looks intentional the moment it appears.
 */
function blurbFor(repo, override) {
  if (override?.blurb) return override.blurb;
  if (repo.description) return truncate(repo.description, 92);

  const topics = repo.repositoryTopics.nodes.map((n) => n.topic.name);
  if (topics.length) return truncate(topics.join(' · '), 92);
  if (repo.primaryLanguage?.name) return `A ${repo.primaryLanguage.name} project. Description coming.`;
  return 'In progress.';
}

/**
 * Fetch and normalise everything the generators need.
 *
 * @param {string} login
 * @param {string} token
 * @param {object} config  parsed profile.config.json
 */
export async function fetchProfile(login, token, config = {}) {
  const data = await graphql(token, { login });
  const user = data.user;
  const hide = new Set(config.hide ?? []);
  const overrides = config.overrides ?? {};

  const repos = user.repositories.nodes
    // The profile repo itself is scaffolding, not a project.
    .filter((r) => r.name.toLowerCase() !== login.toLowerCase())
    .filter((r) => !r.isArchived && !r.isPrivate)
    .filter((r) => !hide.has(r.name))
    .map((r) => {
      const o = overrides[r.name] ?? {};
      return {
        name: r.name,
        displayName: o.displayName ?? r.name,
        blurb: blurbFor(r, o),
        description: r.description ?? '',
        url: r.url,
        live: r.homepageUrl || '',
        stars: r.stargazerCount,
        forks: r.forkCount,
        pushedAt: r.pushedAt,
        language: r.primaryLanguage?.name ?? '',
        languageColor: o.accent ?? r.primaryLanguage?.color ?? '',
        topics: r.repositoryTopics.nodes.map((n) => n.topic.name),
        languages: r.languages?.edges?.map((e) => ({
          name: e.node.name,
          size: e.size,
          color: e.node.color,
        })) ?? [],
      };
    });

  const cal = user.contributionsCollection.contributionCalendar;
  const days = cal.weeks.flatMap((w) => w.contributionDays);

  return {
    user: {
      name: config.name || user.name || user.login,
      login: user.login,
      role: config.role || 'Creative Technologist',
      tagline: config.tagline || user.bio || '',
      followers: user.followers.totalCount,
    },
    repos,
    stats: {
      repoCount: repos.length,
      stars: repos.reduce((a, r) => a + r.stars, 0),
      contributions: cal.totalContributions,
      commits: user.contributionsCollection.totalCommitContributions,
      ...streaks(days),
      days,
      languages: languageSplit(repos),
    },
    generatedAt: new Date().toISOString(),
  };
}
