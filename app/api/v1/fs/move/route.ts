import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/agent/server";
import { getSessionActor } from "@/lib/auth/require-session";
import { apiError, audit, invalidRequest, move, readJson, requireString } from "@/lib/host";

export const dynamic = "force-dynamic";

// os-rr POST /fs/move {from,to} → rename/move within WRITE roots.
export async function POST(req: Request) {
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const actor = await getSessionActor();
  const body = await readJson(req);
  const from = requireString(body, "from");
  if (from === null) return invalidRequest("from");
  const to = requireString(body, "to");
  if (to === null) return invalidRequest("to");
  try {
    await move(from, to);
    audit({ action: "fs.move", actor, target: `${from} → ${to}`, ok: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    audit({ action: "fs.move", actor, target: `${from} → ${to}`, ok: false, detail: String(e) });
    return apiError("fs/move", e);
  }
}
