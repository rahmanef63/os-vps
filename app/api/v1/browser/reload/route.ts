import { NextResponse } from "next/server";
import { browserFetch, verifyAgentAuth, browserConfigured } from "@/lib/agent/server";
import { apiError } from "@/lib/host";

export const dynamic = "force-dynamic";

// POST → reload current page → {url,title}.
export async function POST(req: Request) {
  if (!browserConfigured())
    return NextResponse.json({ error: "browser not configured" }, { status: 501 });
  if (!(await verifyAgentAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const r = await browserFetch("/reload", { method: "POST" }, req);
    return NextResponse.json(await r.json());
  } catch (e) {
    return apiError("browser/reload", e, { status: 502, error: "Browser request failed" });
  }
}
