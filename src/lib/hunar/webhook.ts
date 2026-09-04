import "server-only";
import crypto from "node:crypto";

const MAX_TIMESTAMP_SKEW_SECONDS = 300;

/**
 * Verifies X-Hunar-Signature per Hunar's webhook spec:
 * signed message = `${timestamp}.` + raw body bytes, HMAC-SHA256 with the API key, base64-encoded.
 * Header may carry multiple comma-separated signatures (multiple active keys); any match is valid.
 */
export function verifyHunarWebhookSignature(params: {
  signatureHeader: string | null;
  timestampHeader: string | null;
  rawBody: string;
  trustedApiKeys: string[];
}): boolean {
  const { signatureHeader, timestampHeader, rawBody, trustedApiKeys } = params;

  if (!signatureHeader || !signatureHeader.trim()) return false;
  if (!timestampHeader || !timestampHeader.trim()) return false;

  const timestamp = Number(timestampHeader.trim());
  if (!Number.isFinite(timestamp)) return false;

  const nowSeconds = Date.now() / 1000;
  if (Math.abs(nowSeconds - timestamp) > MAX_TIMESTAMP_SKEW_SECONDS) return false;

  const signatures = signatureHeader
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (signatures.length === 0) return false;

  const message = Buffer.concat([
    Buffer.from(`${timestampHeader.trim()}.`, "utf-8"),
    Buffer.from(rawBody, "utf-8"),
  ]);

  for (const key of trustedApiKeys) {
    const computed = crypto
      .createHmac("sha256", key)
      .update(message)
      .digest("base64");
    const computedBuf = Buffer.from(computed, "utf-8");

    for (const sig of signatures) {
      const sigBuf = Buffer.from(sig, "utf-8");
      if (
        sigBuf.length === computedBuf.length &&
        crypto.timingSafeEqual(sigBuf, computedBuf)
      ) {
        return true;
      }
    }
  }

  return false;
}
