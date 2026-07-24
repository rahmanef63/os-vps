import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/agent/server";
import { isManagedAppId } from "@/lib/managed-apps/catalog";
import { getManagedAppLogs } from "@/lib/managed-apps/manager";

export const dynamic = "force-dynamic";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await verifyAuth(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!isManagedAppId(id)) return NextResponse.json({ error: "unknown managed application" }, { status: 404 });
  return NextResponse.json(await getManagedAppLogs(id));
}
