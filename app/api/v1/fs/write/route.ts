import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/agent/server";
import { getSessionActor } from "@/lib/auth/require-session";
import { audit, writeFile } from "@/lib/host";

export const dynamic = "force-dynamic";

// os-rr POST /fs/write {path,content} → write within WRITE roots.
export async function POST(req: Request) {
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const actor = await getSessionActor();
  const { path, content } = (await req.json()) as { path: string; content: string };
  try {
    await writeFile(path, content);
    audit({ action: "fs.write", actor, target: path, ok: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    audit({ action: "fs.write", actor, target: path, ok: false, detail: String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
