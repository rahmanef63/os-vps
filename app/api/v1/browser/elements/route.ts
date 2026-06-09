import { NextResponse } from "next/server";
import { browserFetch, verifyAuth, browserConfigured } from "@/lib/agent/server";
import { apiError } from "@/lib/host";

export const dynamic = "force-dynamic";

// GET → {url,title,elements[]} structured interactive elements + a stable
// selector candidate each, so an agent can act by selector (deterministic)
// instead of guessing pixel coords from the screenshot.
export async function GET(req: Request) {
  if (!browserConfigured())
    return NextResponse.json({ error: "browser not configured" }, { status: 501 });
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const r = await browserFetch("/elements", undefined, req);
    return NextResponse.json(await r.json());
  } catch (e) {
    return apiError("browser/elements", e, { status: 502, error: "Browser request failed" });
  }
}
