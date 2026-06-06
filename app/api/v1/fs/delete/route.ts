import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/agent/server";
import { getSessionActor } from "@/lib/auth/require-session";
import { audit, remove } from "@/lib/host";

export const dynamic = "force-dynamic";

// os-rr DELETE /fs/delete {path} → recursive remove within WRITE roots.
export async function DELETE(req: Request) {
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const actor = await getSessionActor();
  const { path } = (await req.json()) as { path: string };
  try {
    await remove(path);
    audit({ action: "fs.delete", actor, target: path, ok: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    audit({ action: "fs.delete", actor, target: path, ok: false, detail: String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
