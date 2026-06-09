import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/agent/server";
import { getSessionActor } from "@/lib/auth/require-session";
import { apiError, audit, invalidRequest, readJson, requireString, writeFile } from "@/lib/host";

export const dynamic = "force-dynamic";

// os-rr POST /fs/write {path,content} → write within WRITE roots.
export async function POST(req: Request) {
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const actor = await getSessionActor();
  const body = await readJson(req);
  const path = requireString(body, "path");
  if (path === null) return invalidRequest("path");
  const content = requireString(body, "content", { allowEmpty: true });
  if (content === null) return invalidRequest("content");
  try {
    await writeFile(path, content);
    audit({ action: "fs.write", actor, target: path, ok: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    audit({ action: "fs.write", actor, target: path, ok: false, detail: String(e) });
    return apiError("fs/write", e);
  }
}
