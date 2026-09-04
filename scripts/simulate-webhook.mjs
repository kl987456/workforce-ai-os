// Simulates a real Hunar `call_summary` webhook delivery against the deployed app,
// with a correctly computed X-Hunar-Signature, to verify the webhook receiver's
// signature verification + DB write path end-to-end without needing a live phone call.
import crypto from "node:crypto";

const APP_URL = process.argv[2] || "https://workforce-ai-os.vercel.app";
const REQUEST_ID = process.argv[3];
const API_KEY = process.env.HUNAR_API_KEY;

if (!REQUEST_ID || !API_KEY) {
  console.error("Usage: HUNAR_API_KEY=... node simulate-webhook.mjs <app-url> <request-id>");
  process.exit(1);
}

const payload = {
  event_type: "call_summary",
  call_id: "simulated-" + crypto.randomUUID(),
  agent_id: "simulated-agent",
  request_id: REQUEST_ID,
  to_number: "+15550142",
  from_phone_number: "+18005551234",
  status: "COMPLETED",
  lifecycle_status: "COMPLETED",
  answered_by: "HUMAN",
  max_retries: 1,
  retry_count: 0,
  retries_left: 1,
  next_retry_scheduled_at: null,
  retry_reason: null,
  duration_seconds: 187.4,
  duration_minutes: 3.1,
  created_at: new Date(Date.now() - 200000).toISOString(),
  started_at: new Date(Date.now() - 190000).toISOString(),
  ended_at: new Date().toISOString(),
  timezone: "America/New_York",
  recording_url: "https://example-recordings.hunar.ai/simulated-call.mp3",
  result: {
    interest_level: "high",
    qualification_summary: "Strong background in Node.js and TypeScript, enthusiastic about the role.",
    compensation_expectation: "$145,000 base",
    notice_period: "2 weeks",
    location_flexibility: "Open to remote",
    recommendation: "advance",
  },
};

const rawBody = JSON.stringify(payload);
const timestamp = Math.floor(Date.now() / 1000).toString();
const message = Buffer.concat([Buffer.from(`${timestamp}.`, "utf-8"), Buffer.from(rawBody, "utf-8")]);
const signature = crypto.createHmac("sha256", API_KEY).update(message).digest("base64");

const res = await fetch(`${APP_URL}/api/webhooks/hunar`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Hunar-Timestamp": timestamp,
    "X-Hunar-Signature": signature,
  },
  body: rawBody,
});

console.log("Status:", res.status);
console.log("Body:", await res.text());
