// Clears campaigns/candidates/calls/webhook_events created while testing locally,
// keeping the cached Hunar agent rows (no need to recreate agents on Hunar each time).
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
await sql`delete from webhook_events`;
await sql`delete from calls`;
await sql`delete from candidates`;
await sql`delete from campaigns`;
console.log("Cleared campaigns, candidates, calls, webhook_events.");
