// SERVER-ONLY. Session gate + the headless-browser bridge. Host fs/exec/sys are
// handled locally in @/lib/host (os-vps runs on the host). The only out-of-process
// dependency left is the Playwright browser service (OS_BROWSER_URL), whose
// shared secret lives here and NEVER reaches the client. Every /api/v1 route
// verifies the signed-cookie session (or the agent token) first.
import { createHash, timingSafeEqual } from "crypto";
import { getSessionActor, requireSession } from "@/lib/auth/require-session";
import { audit, type AuditAction } from "@/lib/host";

const BROWSER_URL = (process.env.OS_BROWSER_URL ?? "").replace(/\/$/, "");
const BROWSER_SECRET = process.env.OS_BROWSER_SECRET ?? "";
// Service-to-service token. Lets a trusted backend (e.g. control-room's agent)
// drive the browser through THIS app's authed + audited routes, WITHOUT ever
// handing it OS_BROWSER_SECRET or the runtime port. os-vps stays the single auth
// boundary in front of the browser. Empty (unset) = session cookie only.
const AGENT_TOKEN = process.env.OS_AGENT_TOKEN ?? "";

// Mutating browser actions get one audit line; reads (screenshot/state/content/
// elements/info) are too high-volume or carry no host risk.
const BROWSER_AUDIT: Record<string, AuditAction> = {
  "/navigate": "browser.navigate",
  "/click": "browser.click",
  "/click-selector": "browser.clickSelector",
  "/fill": "browser.fill",
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
// as bytes (the screenshot). Agent-token callers have no cookie → attribute the
// audit line to "agent" rather than dropping the actor.
export async function browserFetch(path: string, init?: RequestInit, req?: Request): Promise<Response> {
  // Each caller drives its OWN runtime tab (consumer) so they never collide on
  // one page. The human Browser app picks a per-tab consumer via `?tab=ui-<n>`
  // (multitab); agent-token callers with no tab default to "agent"; a plain
  // session with no tab defaults to "ui".
  const actor = (await getSessionActor()) ?? "agent";
  let consumer = actor === "agent" ? "agent" : "ui";
  const tab = req ? new URL(req.url).searchParams.get("tab") : null;
  if (tab) consumer = tab.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || consumer;
  const action = BROWSER_AUDIT[path];
  if (action) {
    const target = typeof init?.body === "string" ? init.body : undefined;
    audit({ action, actor, target });
  }
  const res = await fetch(BROWSER_URL + path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "x-os-browser-secret": BROWSER_SECRET,
      "x-os-browser-consumer": consumer,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`browser ${res.status}`);
  return res;
}

// Constant-time compare of the presented agent token against OS_AGENT_TOKEN.
// Disabled (always false) unless a >=16-char token is configured.
function agentTokenOk(req?: Request): boolean {
  if (!req || AGENT_TOKEN.length < 16) return false;
  const provided = req.headers.get("x-os-agent-token") ?? "";
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(AGENT_TOKEN).digest();
  return timingSafeEqual(a, b);
}

// Verifies the caller holds a valid signed-cookie session (sent automatically on
// same-origin requests) OR a valid agent token header (service-to-service).
export async function verifyAuth(req?: Request): Promise<boolean> {
  if (agentTokenOk(req)) return true;
  return requireSession();
}
