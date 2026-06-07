import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { verifyAuth, browserConfigured } from "@/lib/agent/server";

export const dynamic = "force-dynamic";

// Audit trail location (mirrors lib/host/audit.ts).
function logPath(): string {
  const env = process.env.OS_AUDIT_LOG;
  if (env && env.trim()) return env.replace(/^~(?=$|\/)/, os.homedir());
  return path.join(os.homedir(), ".os-vps", "audit.log");
}

// GET → recent browser actions (newest first) for the AI panel: shows what the
// agent (and the UI) did to the browser. actor "agent" = driven by the CLI/agent.
export async function GET(req: Request) {
  if (!browserConfigured())
    return NextResponse.json({ error: "browser not configured" }, { status: 501 });
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const raw = await fs.readFile(logPath(), "utf8").catch(() => "");
    const entries = raw
      .split("\n")
      .filter(Boolean)
      .slice(-500)
      .map((l) => {
        try {
          return JSON.parse(l) as { ts?: string; action?: string; actor?: string; target?: string };
        } catch {
          return null;
        }
      })
      .filter((e): e is { ts?: string; action: string; actor?: string; target?: string } =>
        Boolean(e && typeof e.action === "string" && e.action.startsWith("browser.")),
      )
      .slice(-100)
      .reverse();
    return NextResponse.json({ entries });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
