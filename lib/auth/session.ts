import crypto from "crypto";

// Signed-cookie session. No Convex/JWT — an HMAC over a base64url payload,
// keyed by OS_SESSION_SECRET.

/** Minimum length for the signing secret. A short/empty key is forgeable. */
export const MIN_SECRET_LEN = 32;

/**
 * Length-safe constant-time string compare. Hashes both sides to a fixed
 * 32-byte SHA-256 digest before `timingSafeEqual`, so the comparison time
 * does NOT depend on the inputs' lengths. A naive `a.length === b.length`
 * early-exit would leak the secret's length over the network. Use this for
 * every password / token / signature compare. Mirrors lib/agent/server.ts.
 */
export function constantTimeEq(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export interface SessionPayload {
  issued_at: number;
  expires_at: number;
  /** Approved device this session was issued to (traceability). */
  device_id?: string;
}

function base64urlEncode(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64url");
}

function base64urlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url");
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

    // constantTimeEq hashes both sides to fixed width, so an attacker can't
    // probe the expected signature's length via timing.
    if (!constantTimeEq(expectedSig, providedSig)) return null;

    const payload: SessionPayload = JSON.parse(base64urlDecode(encodedPayload).toString("utf8"));
    if (typeof payload.expires_at !== "number" || payload.expires_at <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
