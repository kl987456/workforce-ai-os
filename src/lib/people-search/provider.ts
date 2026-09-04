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

  const yearsMatch = raw.match(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)/i);

  return {
    raw,
    keywords,
    seniority: seniorityMatch?.[0]?.toLowerCase(),
    location: locationMatch?.[0],
    minYearsExperience: yearsMatch ? Number(yearsMatch[1]) : undefined,
  };
}

/**
 * Scores a candidate against a parsed job description on a 0–1 scale, blending:
 *  - keyword overlap across title/summary/company/skills (how much of the JD's
 *    vocabulary shows up on the candidate)
 *  - skill coverage (how much of the candidate's own skillset the JD actually asked for)
 *  - seniority-title match
 *  - years-of-experience fit against any "N+ years" the JD stated
 * Always returns a value in [0, 1] — callers must not further inflate or floor it,
 * since an honest low score is more useful than a manufactured "still looks decent" one.
 */
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
  const keywordScore = hits / Math.max(query.keywords.length, 1);

  const matchedSkills = candidate.skills.filter((s) =>
    query.keywords.some((kw) => s.toLowerCase().includes(kw) || kw.includes(s.toLowerCase()))
  );
  const skillScore = matchedSkills.length / Math.max(candidate.skills.length, 1);

  const seniorityScore =
    query.seniority && candidate.title.toLowerCase().includes(query.seniority) ? 1 : 0;

  let experienceScore = 0.5; // neutral when the JD doesn't state a requirement
  if (query.minYearsExperience != null) {
    const gap = candidate.yearsExperience - query.minYearsExperience;
    // Meets or exceeds the bar: full credit, tapering slightly if wildly overqualified.
    // Falls short: credit shrinks the further below the bar they are.
    experienceScore = gap >= 0 ? Math.max(0.7, 1 - gap * 0.02) : Math.max(0, 1 + gap * 0.18);
  }

  const base =
    keywordScore * 0.4 + skillScore * 0.3 + seniorityScore * 0.1 + experienceScore * 0.2;

  return Math.max(0, Math.min(1, base));
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
      matchScore: Math.round(c.matchScore * 1000) / 10,
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
