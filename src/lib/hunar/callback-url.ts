import "server-only";

/** Thrown when APP_BASE_URL isn't a public HTTPS URL Hunar's servers can call back. */
export class InvalidCallbackUrlError extends Error {}

/**
 * Resolves the webhook URL Hunar should call back with call status/recording/result/summary
 * events. Hunar validates callback_config URLs up front and rejects the whole call with a 422
 * if they aren't HTTPS — localhost is never reachable by Hunar's servers anyway, so callers
 * should fail fast with the actionable message this throws instead of surfacing Hunar's raw
 * nested validation error (or silently leaving the call stuck since no webhook can arrive).
 *
 * Shared by the single-call and bulk-call routes so the check stays identical in both places.
 */
export function getWebhookCallbackUrl(): string {
  const base = process.env.APP_BASE_URL;
  if (!base) throw new Error("APP_BASE_URL is not set");
  const trimmed = base.replace(/\/$/, "");

  if (!/^https:\/\//i.test(trimmed)) {
    throw new InvalidCallbackUrlError(
      `APP_BASE_URL must be a public HTTPS URL that Hunar can call back (currently "${trimmed}"). Deploy this app or expose it via an HTTPS tunnel (e.g. ngrok), then update APP_BASE_URL.`
    );
  }

  return `${trimmed}/api/webhooks/hunar`;
}
