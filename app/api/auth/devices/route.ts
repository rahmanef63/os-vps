import { NextRequest, NextResponse } from "next/server";
import {
  approveDevice,
  isValidDeviceId,
  listDevices,
  revokeDevice,
} from "@/lib/auth/device-store";
import { requireSession } from "@/lib/auth/require-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-app device management. Only an already-authenticated (trusted) session may
// list pending devices and approve/revoke them — so the owner can approve a new
// device from one that's already logged in, without the CLI.

export async function GET() {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await listDevices());
}

export async function POST(req: NextRequest) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { action?: string; deviceId?: string; label?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { action, deviceId, label } = body;
  if (!isValidDeviceId(deviceId)) {
    return NextResponse.json({ error: "Missing or invalid device id" }, { status: 400 });
  }
  if (action === "approve") {
    await approveDevice(deviceId, typeof label === "string" ? label : undefined);
  } else if (action === "revoke") {
    await revokeDevice(deviceId);
  } else {
    return NextResponse.json({ error: "action must be approve or revoke" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...(await listDevices()) });
}
