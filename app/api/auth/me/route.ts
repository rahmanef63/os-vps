import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/require-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight session probe for the client AuthGate. No secrets returned.
export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    authenticated: session !== null,
    deviceId: session?.device_id ?? null,
  });
}
