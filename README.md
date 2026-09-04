# Workforce AI Operating System

A Hunar.AI take-home assignment: one Next.js app covering all three deliverables.

1. **AI Hiring Assistant** — create a requisition, add candidates, and have a Hunar Voice AI
   agent conduct the first-round phone screen. Extracted answers land on a dashboard once the
   call ends.
2. **Talent Search & Reachout** — paste a job description, get a ranked candidate shortlist, and
   trigger a Hunar voice outreach call per candidate. Conversation responses flow back the same
   way.
3. **Offline Attendance, No Smartphones** — a written design proposal at `/attendance-os` (not a
   live product) answering: how would you track daily attendance for 1,000 people across 100
   locations if smartphones didn't exist but LLMs did?

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Drizzle ORM · Neon Postgres
(via the Vercel Marketplace) · Hunar Voice AI (`api.voice.hunar.ai`).

## How the Hunar integration works

- `src/lib/hunar/client.ts` — thin server-only client over `/agents`, `/calls`, `/numbers`.
- `src/lib/hunar/agent-templates.ts` + `ensure-agent.ts` — two agents (hiring screen, talent
  reachout) are created once via the Hunar API on first use and cached in Postgres.
- `src/app/api/calls/route.ts` — places a call via `POST /calls/`, with `callback_config` pointed
  at this app's webhook endpoint for all four event types.
- `src/app/api/webhooks/hunar/route.ts` — receives `call_status_updated`, `call_recording_done`,
  `call_result_done`, `call_summary`; verifies `X-Hunar-Signature` (HMAC-SHA256 over the raw body)
  before writing anything, and logs every delivery (valid or not) to `webhook_events` for
  auditability.
- The two feature pages poll `GET /api/campaigns/[id]` every 5s while a call is in flight, so
  status and extracted results appear without a manual refresh.

## People search (Feature 2)

No People Data Labs / Apollo.io / Proxycurl / Coresignal API key was provided with this
assignment. `src/lib/people-search/provider.ts` defines a small provider-agnostic interface
(`PeopleSearchProvider.search(query)`); the only implementation wired in today is a seeded,
realistic 24-person demo talent pool (`seed-data.ts`) ranked against the job description with a
keyword/skill-overlap scorer. Dropping in a real provider is a matter of implementing that one
interface and swapping it in `getPeopleSearchProvider()` — no UI or API route changes needed.

Seeded candidate phone numbers use the NANP fictional test block (`+1-555-01xx`, reserved by
NANPA for exactly this purpose) so nothing can be dialed by accident. Every "trigger call" dialog
lets you override the number before placing a real Hunar call — use your own number to test.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in HUNAR_API_KEY, DATABASE_URL, APP_BASE_URL
npm run db:push              # push the Drizzle schema to Postgres
npm run dev
```

`APP_BASE_URL` must be a real HTTPS URL Hunar's servers can reach for webhooks to arrive —
`http://localhost:3000` will place calls fine but Hunar will reject the callback URLs (HTTPS is
required), so webhook-delivered results only show up on the deployed URL.

Useful scripts: `npm run db:studio` (Drizzle Studio), `npm run db:reset-demo` (clears
campaigns/candidates/calls, keeps the cached Hunar agents).

## Project structure

```
src/
  app/
    page.tsx                    # overview
    hiring-assistant/           # feature 1
    talent-search/              # feature 2
    attendance-os/              # feature 3 (write-up)
    api/
      campaigns/                # requisitions & search campaigns (+ candidates)
      calls/                    # places a Hunar call
      webhooks/hunar/           # signed webhook receiver
      health/                   # Hunar connectivity check
  components/
    shell/                      # app chrome (sidebar, header, mobile nav)
    workforce/                  # shared candidate/call list UI
    ui/                         # shadcn/ui primitives
  db/                           # Drizzle schema + client
  lib/
    hunar/                      # Hunar API client, webhook verification, agent templates
    people-search/              # provider-agnostic search + seeded dataset
```

## Deployment

Deployed on Vercel, database on Neon (Vercel Marketplace integration). Environment variables are
managed via `vercel env`; `HUNAR_API_KEY` is never committed and is stored as a sensitive/encrypted
Vercel environment variable.
