import { NextResponse } from "next/server";
import { browserFetch, verifyAuth, browserConfigured } from "@/lib/agent/server";
import { getSessionActor } from "@/lib/auth/require-session";
import { audit, makeDir, uploadInto } from "@/lib/host";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_DIR = "~/Pictures/Screenshots";

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// POST → grab the caller tab's current viewport as PNG (via the browser bridge)
// and write it into a bounded host folder. Body: { dir? }. The os-browser secret
// stays server-side (browserFetch); the write goes through lib/host bounds, so
// the path can't escape the WRITE roots. The tab/consumer is read from ?tab=.
export async function POST(req: Request) {
  if (!browserConfigured())
    return NextResponse.json({ error: "browser not configured" }, { status: 501 });
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const actor = await getSessionActor();
  const body = (await req.json().catch(() => ({}))) as { dir?: string };
  const dir = body.dir?.trim() || DEFAULT_DIR;
  const name = `shot-${stamp()}.png`;

  try {
    const r = await browserFetch(`/screenshot?type=png`, undefined, req);
    const data = new Uint8Array(await r.arrayBuffer());
    await makeDir(dir);
    const res = await uploadInto(dir, [{ relPath: name, data }]);
    if (!res.written) throw new Error("write rejected — folder outside the allowed roots?");
    const path = `${dir.replace(/\/$/, "")}/${name}`;
    audit({ action: "fs.upload", actor, target: path, ok: true, detail: "browser screenshot" });
    return NextResponse.json({ path });
  } catch (e) {
    audit({ action: "fs.upload", actor, target: dir, ok: false, detail: String(e) });
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
