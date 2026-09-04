import type { PersonResult } from "./types";
import generated from "./seed-data.generated.json";

/**
 * Seeded demo talent pool standing in for a real people-search provider
 * (People Data Labs / Apollo.io / Proxycurl / Coresignal). The adapter
 * interface in `provider.ts` is provider-agnostic — swap in a real HTTP
 * client here without touching any UI or API route.
 *
 * Generated via `scripts/generate-seed-data.mjs` — 1,000+ synthetic profiles
 * spanning ~50 IT/software role archetypes (frontend/backend/full-stack,
 * data & ML, DevOps/SRE/cloud, QA, security, IT support, product/design,
 * and more), globally distributed. Re-run the generator to regenerate.
 *
 * Phone numbers use the "555" exchange convention (+1<area>555<line>) that
 * software and media have used for decades to signal a non-dialable
 * placeholder number — the same convention Faker.js uses. The UI still
 * requires a human to open a dialog and edit/confirm a number before any
 * real Hunar call is placed.
 */
export const SEEDED_TALENT_POOL: Omit<PersonResult, "matchScore">[] = generated;
