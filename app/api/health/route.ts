import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public liveness probe — no auth. Used by systemd WatchdogSec / Dokploy /
// uptime monitors. Cheap, never cached. Returns build identity + uptime so
// rollback verification can compare {buildId} before/after a restart.
let cachedVersion: string | null = null;
async function readVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion;
  try {
    const pkg = await readFile(path.join(process.cwd(), "package.json"), "utf8");
    cachedVersion = (JSON.parse(pkg).version as string) ?? "0.0.0";
  } catch {
    cachedVersion = "0.0.0";
  }
  return cachedVersion;
}

export async function GET() {
  const version = await readVersion();
  return NextResponse.json(
    {
      status: "ok",
      buildId: process.env.NEXT_PUBLIC_BUILD_ID || "dev",
      uptime: Math.round(process.uptime()),
      version,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
