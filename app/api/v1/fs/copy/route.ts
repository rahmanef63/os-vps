import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/agent/server";
import { getSessionActor } from "@/lib/auth/require-session";
import { audit, copy } from "@/lib/host";

export const dynamic = "force-dynamic";

// os-rr POST /fs/copy {from,to} → recursive copy within WRITE roots.
export async function POST(req: Request) {
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const actor = await getSessionActor();
  const { from, to } = (await req.json()) as { from: string; to: string };
  try {
    await copy(from, to);
    audit({ action: "fs.copy", actor, target: `${from} → ${to}`, ok: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    audit({ action: "fs.copy", actor, target: `${from} → ${to}`, ok: false, detail: String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
