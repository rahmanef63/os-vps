import crypto from "crypto";

// Signed-cookie session. No Convex/JWT — an HMAC over a base64url payload,
// keyed by OS_SESSION_SECRET.

/** Minimum length for the signing secret. A short/empty key is forgeable. */
export const MIN_SECRET_LEN = 32;

export interface SessionPayload {
  issued_at: number;
  expires_at: number;
  /** Approved device this session was issued to (traceability). */
  device_id?: string;
}

function base64urlEncode(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  const paddedStr = pad ? padded + "=".repeat(4 - pad) : padded;
  return Buffer.from(paddedStr, "base64");
}

export function signSession(payload: SessionPayload, secret: string): string {
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(encodedPayload);
  return `${encodedPayload}.${base64urlEncode(hmac.digest())}`;
}

export function verifySession(cookie: string, secret: string): SessionPayload | null {
  try {
    // Fail-closed: a missing/short signing key means anyone could forge a
    // cookie. Reject every cookie rather than validate against a weak key.
    if (!secret || secret.length < MIN_SECRET_LEN) return null;

    const parts = cookie.split(".");
    if (parts.length !== 2) return null;
    const [encodedPayload, providedSig] = parts;

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(encodedPayload);
    const expectedSig = base64urlEncode(hmac.digest());

    const expectedBuf = Buffer.from(expectedSig, "utf8");
    const providedBuf = Buffer.from(providedSig, "utf8");
    if (expectedBuf.length !== providedBuf.length) return null;
    if (!crypto.timingSafeEqual(expectedBuf, providedBuf)) return null;

    const payload: SessionPayload = JSON.parse(base64urlDecode(encodedPayload).toString("utf8"));
    if (typeof payload.expires_at !== "number" || payload.expires_at <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
