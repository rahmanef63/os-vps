// Block SSRF to loopback / private / link-local / cloud-metadata hosts for
// user-supplied base URLs (BYOK custom providers). Hostname-literal check —
// catches direct-IP + localhost. Ported from models-rahmanef-com (ConvexError →
// plain Error so the API route surfaces the message).
// ponytail: does NOT resolve DNS, so a public hostname that resolves to a private
// IP (DNS rebinding) still slips through — upgrade to connect-time IP resolution +
// pinning if untrusted users register at scale. Single-owner here, so literal-check is enough.
export function assertSafeUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("Base URL is not a valid URL");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Base URL must be http or https");
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const bad =
    h === "localhost" || h === "0.0.0.0" || h === "::1" || h.endsWith(".local") || h.endsWith(".internal") ||
    /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^(fc|fd)[0-9a-f]{2}:/i.test(h) || /^fe80:/i.test(h);
  if (bad) throw new Error("Base URL host not allowed (private / loopback / link-local / metadata)");
  return u;
}
