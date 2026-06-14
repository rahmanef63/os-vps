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
    // Route shape goes into structured `meta` (since the audit field exists)
    // instead of being packed into `target` — easier to filter with `jq`,
    // greppable as `routerKind`/`routeType` keys, and leaves `target` clean
    // for the actual path the request hit.
    await audit({
      action: "framework.error",
      ok: false,
      actor: null,
      target: request.path,
      detail: `${e.name}: ${e.message}`,
      meta: {
        routerKind: context.routerKind,
        routeType: context.routeType,
      },
    });
  } catch {
    // never crash here — best-effort logging only
  }
};
