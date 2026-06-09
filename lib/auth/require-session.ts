import { cookies } from "next/headers";
import { verifySession, type SessionPayload } from "./session";
import { isApproved } from "./device-store";

export const SESSION_COOKIE = "session";

function secret(): string {
  return process.env.OS_SESSION_SECRET ?? "";
}

// Reads + verifies the signed session cookie. Returns the payload or null.
// Server-only (uses next/headers cookies()).
//
// Revocation: a valid HMAC is not enough — the session is only honoured while
// its device is STILL in the approved allowlist. Without this re-check, revoking
// a lost/stolen device wouldn't kill its live sessions until natural expiry
// (the very case revoke exists for). A session carrying no device_id is also
// rejected (login always stamps one; a payload without it is legacy/forged).
export async function getSession(): Promise<SessionPayload | null> {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  const payload = verifySession(cookie, secret());
  if (!payload?.device_id) return null;
  if (!(await isApproved(payload.device_id))) return null;
  return payload;
}

// True when the caller holds a valid session. Used by /api/v1 routes in place
// of the old Convex Bearer check (verifyAuth). The session cookie is sent
// automatically on same-origin requests (incl. <img>, fetch).
export async function requireSession(): Promise<boolean> {
  return (await getSession()) !== null;
}

// The approved device id behind the current session, or null. Used to attribute
// audit-log entries to an actor without re-reading the cookie in every route.
export async function getSessionActor(): Promise<string | null> {
  return (await getSession())?.device_id ?? null;
}
