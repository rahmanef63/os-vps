import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/agent/server";
import { getSessionActor } from "@/lib/auth/require-session";
import { audit, move } from "@/lib/host";

export const dynamic = "force-dynamic";

// os-rr POST /fs/move {from,to} → rename/move within WRITE roots.
export async function POST(req: Request) {
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const actor = await getSessionActor();
  const { from, to } = (await req.json()) as { from: string; to: string };
  try {
    await move(from, to);
    audit({ action: "fs.move", actor, target: `${from} → ${to}`, ok: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    audit({ action: "fs.move", actor, target: `${from} → ${to}`, ok: false, detail: String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
