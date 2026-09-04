import type { ParsedJobQuery, PeopleSearchProvider, PersonResult } from "./types";
import { SEEDED_TALENT_POOL } from "./seed-data";

const STOPWORDS = new Set([
  "the", "and", "for", "with", "you", "our", "are", "will", "have", "has",
  "this", "that", "from", "your", "who", "role", "job", "team", "work",
  "years", "year", "experience", "strong", "ability", "must", "should",
  "we're", "we", "looking", "candidate", "candidates", "responsibilities",
  "requirements", "about", "company", "a", "an", "of", "to", "in", "on",
  "is", "as", "or", "at", "be", "not", "into", "using",
]);

export function parseJobDescription(raw: string): ParsedJobQuery {
  const tokens = raw
    .toLowerCase()
    .replace(/[^a-z0-9+.#\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));

  const keywords = Array.from(new Set(tokens));

  const seniorityMatch = raw.match(
    /\b(intern|junior|entry[- ]level|mid[- ]level|senior|staff|principal|lead|director|vp|head of)\b/i
  );

  const locationMatch = raw.match(
    /\b(remote|hybrid|on[- ]site|[A-Z][a-z]+(?:,\s?[A-Z]{2})?)\b/
  );

  return {
    raw,
    keywords,
    seniority: seniorityMatch?.[0]?.toLowerCase(),
    location: locationMatch?.[0],
  };
}

function scoreCandidate(
  candidate: Omit<PersonResult, "matchScore">,
  query: ParsedJobQuery
): number {
  const haystack = [
    candidate.title,
    candidate.summary,
    candidate.company,
    ...candidate.skills,
  ]
    .join(" ")
    .toLowerCase();

  let hits = 0;
  for (const kw of query.keywords) {
    if (haystack.includes(kw)) hits += 1;
  }
  const skillHits = candidate.skills.filter((s) =>
    query.keywords.some((kw) => s.toLowerCase().includes(kw) || kw.includes(s.toLowerCase()))
  ).length;

  const denom = Math.max(query.keywords.length, 1);
  const base = (hits / denom) * 0.6 + (skillHits / Math.max(candidate.skills.length, 1)) * 0.4;

  if (query.seniority && candidate.title.toLowerCase().includes(query.seniority)) {
    return Math.min(1, base + 0.15);
  }
  return base;
}

export const seededPeopleSearchProvider: PeopleSearchProvider = {
  id: "seeded-demo-pool",
  label: "Demo data source (seeded talent pool)",
  async search(query, limit = 12) {
    const scored: PersonResult[] = SEEDED_TALENT_POOL.map((c) => ({
      ...c,
      matchScore: scoreCandidate(c, query),
    }));

    scored.sort((a, b) => b.matchScore - a.matchScore);

    return scored.slice(0, limit).map((c) => ({
      ...c,
      matchScore: Math.round(Math.max(c.matchScore, 0.35) * 1000) / 10,
    }));
  },
};

/**
 * Returns the active people-search provider. Wire a real provider (PDL,
 * Apollo.io, Proxycurl, Coresignal) here once credentials are available —
 * every caller goes through this single seam, so no UI or route changes
 * are needed to flip from demo data to a live provider.
 */
export function getPeopleSearchProvider(): PeopleSearchProvider {
  return seededPeopleSearchProvider;
}
