import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/agent/server";
import { listManagedApps } from "@/lib/managed-apps/manager";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await verifyAuth(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ apps: await listManagedApps() });
  } catch {
    return NextResponse.json({ error: "managed applications unavailable" }, { status: 503 });
  }
}
