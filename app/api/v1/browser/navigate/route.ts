import { NextResponse } from "next/server";
import { browserFetch, verifyAgentAuth, browserConfigured } from "@/lib/agent/server";
import { apiError } from "@/lib/host";

export const dynamic = "force-dynamic";

// POST {url} → remote browser navigates → {url,title}.
export async function POST(req: Request) {
  if (!browserConfigured())
    return NextResponse.json({ error: "browser not configured" }, { status: 501 });
  if (!(await verifyAgentAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  try {
    const r = await browserFetch("/navigate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: String(body.url ?? "") }),
    }, req);
    return NextResponse.json(await r.json());
  } catch (e) {
    return apiError("browser/navigate", e, { status: 502, error: "Browser request failed" });
  }
}
