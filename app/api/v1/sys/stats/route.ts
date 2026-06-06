import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/agent/server";
import { stats } from "@/lib/host";

export const dynamic = "force-dynamic";

// os-rr GET /sys/stats → live host CPU/mem/disk/uptime (SysStats).
export async function GET(req: Request) {
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    return NextResponse.json(await stats());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
