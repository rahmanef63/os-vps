import { NextResponse } from "next/server";
import { browserFetch, verifyAuth, browserConfigured } from "@/lib/agent/server";

export const dynamic = "force-dynamic";

// GET → 1280x800 viewport PNG of the shared remote page, streamed through.
export async function GET(req: Request) {
  if (!browserConfigured())
    return NextResponse.json({ error: "browser not configured" }, { status: 501 });
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const r = await browserFetch("/screenshot");
    const buf = await r.arrayBuffer();
    return new NextResponse(buf, {
      headers: { "content-type": "image/png", "cache-control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
