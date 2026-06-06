import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/agent/server";
import { getSessionActor } from "@/lib/auth/require-session";
import { audit, rateLimited, runCommand } from "@/lib/host";

export const dynamic = "force-dynamic";

// Burst guard for the privileged shell endpoint (the login route has its own).
const EXEC_MAX = 60;
const EXEC_WINDOW_MS = 60_000;

// os-rr POST /exec/run {cmd,cwd?} → one-shot bash on the host {stdout,stderr,code}.
export async function POST(req: Request) {
  if (!(await verifyAuth(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const actor = await getSessionActor();
  if (rateLimited(`exec:${actor ?? "anon"}`, EXEC_MAX, EXEC_WINDOW_MS)) {
    audit({ action: "exec.run", actor, ok: false, detail: "rate-limited" });
    return NextResponse.json({ error: "Too many commands, slow down" }, { status: 429 });
  }

  const { cmd, cwd } = (await req.json()) as { cmd: string; cwd?: string };
  try {
    const result = await runCommand(cmd, cwd);
    const blocked = result.code === 126 && result.stderr.startsWith("refused:");
    audit({
      action: blocked ? "exec.blocked" : "exec.run",
      actor,
      target: cmd,
      ok: !blocked && result.code === 0,
      detail: `exit ${result.code}${cwd ? ` @ ${cwd}` : ""}`,
    });
    return NextResponse.json(result);
  } catch (e) {
    audit({ action: "exec.run", actor, target: cmd, ok: false, detail: String(e) });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
