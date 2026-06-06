import { NextResponse } from "next/server";
import { browserFetch, verifyAuth, browserConfigured } from "@/lib/agent/server";

export const dynamic = "force-dynamic";

// POST {text} → type into the focused element → {ok}.
export async function POST(req: Request) {
  if (!browserConfigured())
    return NextResponse.json({ error: "browser not configured" }, { status: 501 });
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  try {
    const r = await browserFetch("/type", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: String(body.text ?? "") }),
    });
    return NextResponse.json(await r.json());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
