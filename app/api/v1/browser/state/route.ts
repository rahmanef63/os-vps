import { NextResponse } from "next/server";
import { browserFetch, verifyAgentAuth, browserConfigured } from "@/lib/agent/server";
import { apiError } from "@/lib/host";

export const dynamic = "force-dynamic";

// GET → {url,title} of the shared remote page.
export async function GET(req: Request) {
  if (!browserConfigured())
    return NextResponse.json({ error: "browser not configured" }, { status: 501 });
  if (!(await verifyAgentAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const r = await browserFetch("/state", undefined, req);
    return NextResponse.json(await r.json());
  } catch (e) {
    return apiError("browser/state", e, { status: 502, error: "Browser request failed" });
  }
}
