import { NextResponse } from "next/server";
import { verifyAuth, browserConfigured } from "@/lib/agent/server";
import { apiError, readAuditTail } from "@/lib/host";

export const dynamic = "force-dynamic";

// GET → recent browser actions (newest first) for the AI panel: shows what the
// agent (and the UI) did to the browser. actor "agent" = driven by the CLI/agent.
// Reads the trail via lib/host (never re-derives the log path) — see audit.ts.
export async function GET(req: Request) {
  if (!browserConfigured())
    return NextResponse.json({ error: "browser not configured" }, { status: 501 });
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const entries = await readAuditTail({ prefix: "browser.", limit: 100 });
    return NextResponse.json({ entries });
  } catch (e) {
    return apiError("browser/agent-log", e);
  }
}
