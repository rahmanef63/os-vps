import { NextResponse } from "next/server";
import pkg from "../../../package.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public liveness probe — no auth. Used by systemd WatchdogSec / Dokploy /
// uptime monitors. Cheap, never cached. Returns build identity + uptime so
// rollback verification can compare {buildId} before/after a restart.
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      buildId: process.env.NEXT_PUBLIC_BUILD_ID || "dev",
      uptime: Math.round(process.uptime()),
      version: pkg.version ?? "0.0.0",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
