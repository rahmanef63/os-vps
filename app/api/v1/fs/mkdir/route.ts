import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/agent/server";
import { getSessionActor } from "@/lib/auth/require-session";
import { audit, makeDir } from "@/lib/host";

export const dynamic = "force-dynamic";

// os-rr POST /fs/mkdir {path} → mkdir -p within WRITE roots.
export async function POST(req: Request) {
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const actor = await getSessionActor();
  const { path } = (await req.json()) as { path: string };
  try {
    await makeDir(path);
    audit({ action: "fs.mkdir", actor, target: path, ok: true });
    return NextResponse.json({ kind: "dir" });
  } catch (e) {
    audit({ action: "fs.mkdir", actor, target: path, ok: false, detail: String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
