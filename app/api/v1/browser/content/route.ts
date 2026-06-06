import { NextResponse } from "next/server";
import { browserFetch, verifyAuth, browserConfigured } from "@/lib/agent/server";

export const dynamic = "force-dynamic";

// GET → {url,title,text} extracted text of the shared remote page.
export async function GET(req: Request) {
  if (!browserConfigured())
    return NextResponse.json({ error: "browser not configured" }, { status: 501 });
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const r = await browserFetch("/content");
    return NextResponse.json(await r.json());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
