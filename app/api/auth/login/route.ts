import { NextRequest, NextResponse } from "next/server";
import { constantTimeEq, MIN_SECRET_LEN, signSession, type SessionPayload } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/require-session";
import { isApproved, isValidDeviceId, recordPending, touchApproved } from "@/lib/auth/device-store";
import { audit } from "@/lib/host";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Password-only + device-approval login, ported from the VPS Control Room.
//   factor 1 = shared password (OS_LOGIN_PASSWORD)
//   factor 2 = device id pre-approved in the device store
// Correct password on an un-approved device → recorded pending, 403, NO cookie.

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;
const MAX_TRACKED_IPS = 1024;
const GLOBAL_MAX_ATTEMPTS = 30;

const rateLimitMap = new Map<string, { count: number; reset_at: number }>();
let globalWindowStart = Date.now();
let globalAttempts = 0;

function clientIp(req: NextRequest): string {
  // Take the LAST x-forwarded-for hop: it is the one our own reverse proxy
  // appended (the FIRST entries are client-supplied and spoofable — rotating
  // them would dodge the per-IP bucket and poison the audit trail). Direct
  // access with a forged header still spoofs this, so :4005 must stay
  // firewalled behind the proxy; the global limiter caps brute force anyway.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",");
    const last = hops[hops.length - 1]?.trim();
    if (last) return last;
  }
  return req.headers.get("x-real-ip") ?? "127.0.0.1";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  if (now - globalWindowStart > WINDOW_MS) {
    globalWindowStart = now;
    globalAttempts = 0;
  }
  if (++globalAttempts > GLOBAL_MAX_ATTEMPTS) return true;

  if (rateLimitMap.size > MAX_TRACKED_IPS) {
    for (const [k, v] of rateLimitMap) if (now > v.reset_at) rateLimitMap.delete(k);
    if (rateLimitMap.size > MAX_TRACKED_IPS) rateLimitMap.clear();
  }
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset_at) {
    rateLimitMap.set(ip, { count: 1, reset_at: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= MAX_ATTEMPTS) return true;
  entry.count += 1;
  return false;
}

export async function POST(req: NextRequest) {
  const sessionSecret = process.env.OS_SESSION_SECRET ?? "";
  const password = process.env.OS_LOGIN_PASSWORD ?? "";
  // Signing key must be strong; the password may be memorable (device is the
  // strong factor). Fail-closed if either is unset/too-weak to be safe.
  if (sessionSecret.length < MIN_SECRET_LEN || password.length < 6) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const ip = clientIp(req);
  if (rateLimited(ip)) {
    audit({ action: "auth.ratelimited", ip, ok: false });
    return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });
  }

  let body: { password?: string; deviceId?: string; deviceLabel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { password: provided, deviceId } = body;
  if (typeof provided !== "string" || provided.length === 0) {
    return NextResponse.json({ error: "bad_password" }, { status: 401 });
  }
  if (!isValidDeviceId(deviceId)) {
    return NextResponse.json({ error: "Missing or invalid device id" }, { status: 400 });
  }
  const label = typeof body.deviceLabel === "string" ? body.deviceLabel.slice(0, 80) : "unknown device";

  // Length-safe: constantTimeEq hashes both sides to a fixed 32-byte digest
  // before comparing, so the compare time does NOT reveal the secret's length.
  if (!constantTimeEq(password, provided)) {
    audit({ action: "auth.denied", actor: deviceId, ip, ok: false, detail: "bad password" });
    return NextResponse.json({ error: "bad_password" }, { status: 401 });
  }

  if (!(await isApproved(deviceId))) {
    await recordPending(deviceId, label, ip);
    audit({ action: "auth.pending", actor: deviceId, ip, ok: false, detail: label });
    return NextResponse.json({ error: "device_pending", deviceId, label }, { status: 403 });
  }
  await touchApproved(deviceId);
  audit({ action: "auth.login", actor: deviceId, ip, ok: true });

  // Guard the env parse: NaN here would mint a cookie that NEVER expires
  // (NaN <= Date.now() is false in verifySession) — fail back to 24h instead.
  const parsedHours = parseInt(process.env.SESSION_EXPIRY_HOURS ?? "24", 10);
  const hours = Number.isFinite(parsedHours) && parsedHours > 0 ? parsedHours : 24;
  const now = Date.now();
  const payload: SessionPayload = {
    issued_at: now,
    expires_at: now + hours * 3600 * 1000,
    device_id: deviceId,
  };
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, signSession(payload, sessionSecret), {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: hours * 3600,
    secure: true,
  });
  return res;
}
