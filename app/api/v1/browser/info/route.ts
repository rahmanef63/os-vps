import { NextResponse } from "next/server";
import { browserFetch, verifyAuth, browserConfigured } from "@/lib/agent/server";
import { apiError } from "@/lib/host";

export const dynamic = "force-dynamic";

// GET → runtime status {ok,url,profile,viewport,headless,extension,idleMs} for
// the Settings → Browser panel. Read-only; no host risk.
export async function GET(req: Request) {
  if (!browserConfigured())
    return NextResponse.json({ error: "browser not configured" }, { status: 501 });
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const r = await browserFetch("/info", undefined, req);
    return NextResponse.json(await r.json());
  } catch (e) {
    return apiError("browser/info", e, { status: 502, error: "Browser request failed" });
  }
}
