import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/agent/server";
import { getSessionActor } from "@/lib/auth/require-session";
import { audit, uploadInto } from "@/lib/host";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST multipart/form-data {dest, file[]} → write each file (binary-safe) into
// dest within WRITE roots. Each `file` part's filename carries its relPath, so
// dropped folders keep their structure.
export async function POST(req: Request) {
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const actor = await getSessionActor();
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "expected multipart/form-data" }, { status: 400 });
  }

  const dest = String(form.get("dest") ?? "~");
  const parts = form.getAll("file").filter((v): v is File => v instanceof File);
  const files = await Promise.all(
    parts.map(async (f) => ({ relPath: f.name, data: new Uint8Array(await f.arrayBuffer()) })),
  );

  try {
    const res = await uploadInto(dest, files);
    audit({
      action: "fs.upload",
      actor,
      target: dest,
      ok: res.failed.length === 0,
      detail: `${res.written} written${res.failed.length ? `, ${res.failed.length} failed` : ""}`,
    });
    return NextResponse.json(res);
  } catch (e) {
    audit({ action: "fs.upload", actor, target: dest, ok: false, detail: String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
