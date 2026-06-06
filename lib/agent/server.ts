// SERVER-ONLY. Session gate + the headless-browser bridge. Host fs/exec/sys are
// handled locally in @/lib/host (os-vps runs on the host). The only out-of-process
// dependency left is the Playwright browser service (OS_BROWSER_URL), whose
// shared secret lives here and NEVER reaches the client. Every /api/v1 route
// verifies the signed-cookie session first.
import { getSessionActor, requireSession } from "@/lib/auth/require-session";
import { audit, type AuditAction } from "@/lib/host";

const BROWSER_URL = (process.env.OS_BROWSER_URL ?? "").replace(/\/$/, "");
const BROWSER_SECRET = process.env.OS_BROWSER_SECRET ?? "";

// Mutating browser actions get one audit line; reads (screenshot/state/content)
// are too high-volume (the screenshot is polled) and carry no host risk.
const BROWSER_AUDIT: Record<string, AuditAction> = {
  "/navigate": "browser.navigate",
  "/click": "browser.click",
  "/type": "browser.type",
  "/key": "browser.key",
  "/scroll": "browser.scroll",
  "/back": "browser.back",
  "/forward": "browser.forward",
  "/reload": "browser.reload",
};

// True when the headless-Chromium (Playwright) bridge env is configured.
export function browserConfigured(): boolean {
  return BROWSER_URL.length > 0 && BROWSER_SECRET.length > 0;
}

// Calls the remote-browser service with the shared secret header, returning the
// RAW Response so callers can `.json()` (state/navigate/...) or read the body
// as bytes (the screenshot PNG).
export async function browserFetch(path: string, init?: RequestInit): Promise<Response> {
  const action = BROWSER_AUDIT[path];
  if (action) {
    const target = typeof init?.body === "string" ? init.body : undefined;
    audit({ action, actor: await getSessionActor(), target });
  }
  const res = await fetch(BROWSER_URL + path, {
    ...init,
    headers: { ...(init?.headers ?? {}), "x-os-browser-secret": BROWSER_SECRET },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`browser ${res.status}`);
  return res;
}

// Verifies the caller holds a valid signed-cookie session (sent automatically
// on same-origin requests). The `req` arg is unused — kept so the /api/v1 route
// handlers that call `verifyAuth(req)` need no edit.
export async function verifyAuth(_req?: Request): Promise<boolean> {
  return requireSession();
}
