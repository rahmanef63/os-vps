import { NextResponse } from "next/server";
import { browserFetch, verifyAuth, browserConfigured } from "@/lib/agent/server";

export const dynamic = "force-dynamic";

// GET → a live MJPEG stream (multipart/x-mixed-replace) of the caller's tab,
// piped straight from the runtime's CDP screencast. An <img src> renders it
// natively — smoother + lighter than the screenshot poll. req.signal aborts the
// upstream when the client disconnects, so the runtime stops the screencast.
export async function GET(req: Request) {
  if (!browserConfigured())
    return NextResponse.json({ error: "browser not configured" }, { status: 501 });
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const r = await browserFetch("/screencast", { signal: req.signal }, req);
    return new NextResponse(r.body, {
      headers: {
        "content-type": r.headers.get("content-type") ?? "multipart/x-mixed-replace; boundary=frame",
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
