import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/agent/server";
import { usage } from "@/lib/host";

export const dynamic = "force-dynamic";

// os-rr GET /fs/usage → {used,total} bytes of the filesystem holding the path.
export async function GET(req: Request) {
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const path = new URL(req.url).searchParams.get("path") ?? "~";
  try {
    return NextResponse.json(await usage(path));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
