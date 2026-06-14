import { NextResponse } from "next/server";
import { browserFetch, verifyAgentAuth, browserConfigured } from "@/lib/agent/server";
import { apiError } from "@/lib/host";

export const dynamic = "force-dynamic";

// GET → viewport screenshot of the caller's tab, streamed through. Pass
// ?type=jpeg&q=<n> for a smaller/faster frame (the viewer polls, so JPEG wins);
// the runtime's content-type is echoed back so the <img> renders either format.
export async function GET(req: Request) {
  if (!browserConfigured())
    return NextResponse.json({ error: "browser not configured" }, { status: 501 });
  if (!(await verifyAgentAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const qs = new URL(req.url).search; // forwards ?type=jpeg&q=..
  try {
    const r = await browserFetch(`/screenshot${qs}`, undefined, req);
    const buf = await r.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "content-type": r.headers.get("content-type") ?? "image/png",
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return apiError("browser/screenshot", e, { status: 502, error: "Browser request failed" });
  }
}
