import { NextResponse } from "next/server";
import { browserFetch, verifyAuth, browserConfigured } from "@/lib/agent/server";

export const dynamic = "force-dynamic";

// POST {key} (e.g. "Enter","Backspace") → press → {url,title}.
export async function POST(req: Request) {
  if (!browserConfigured())
    return NextResponse.json({ error: "browser not configured" }, { status: 501 });
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  try {
    const r = await browserFetch("/key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: String(body.key ?? "") }),
    });
    return NextResponse.json(await r.json());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
