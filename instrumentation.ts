// Next 16 framework error hook. Routes uncaught render/RSC/route errors into
// the audit module so they land in the same forensic trail as exec/fs/auth
// events — no extra log channel, no extra ops surface. Best-effort: this
// handler must NEVER throw (would mask the real error).
import type { Instrumentation } from "next";

export async function register() {
  // No-op for now; reserved for future tracing init.
}

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  try {
    const { audit } = await import("./lib/host/audit");
    const e = err instanceof Error ? err : new Error(String(err));
    // audit.target is a string — pack the route shape into it so the trail
    // stays greppable (e.g. `routerKind=app routeType=route path=/api/...`).
    const target = `${request.path} (${context.routerKind}:${context.routeType})`;
    await audit({
      action: "framework.error",
      ok: false,
      actor: null,
      target,
      detail: `${e.name}: ${e.message}`,
    });
  } catch {
    // never crash here — best-effort logging only
  }
};
