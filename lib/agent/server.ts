// SERVER-ONLY. Session gate for /api/v1 routes. Host fs/exec/sys are handled
// locally in @/lib/host (os-vps runs on the host). The former headless-browser
// bridge (OS_BROWSER_URL + OS_AGENT_TOKEN) was retired with the os-browser
// service — the Browser app renders pages in a client-side iframe now.
import { requireSession } from "@/lib/auth/require-session";
import { IS_DEMO } from "@/lib/demo";

// Cookie-only auth. Used by every /api/v1 route (fs, exec, term, sys, editor,
// apps, stock).
export async function verifyAuth(req?: Request): Promise<boolean> {
  void req; // kept for call-site symmetry
  if (IS_DEMO) return false;
  return requireSession();
}
