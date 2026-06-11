// SERVER-ONLY. The environment handed to spawned shells (exec + PTY) with the
// app's OWN secrets scrubbed out. Without this, any `printenv` in the terminal
// reveals the session secret / login password / browser secret / agent token /
// BYOK key — which would let a hijacked session mint cookies forever, defeating
// the credential denylist in paths.ts. PATH/HOME/SHELL/locale + everything else
// pass through unchanged (a real login shell still works).
//
// Residual (documented in SECURITY.md): a same-uid process can still read
// /proc/<pid>/environ of the os-vps process itself — the boundary is the OS
// user, not this scrub. This only stops the trivial in-terminal `printenv`.
const SECRET_VARS = new Set([
  "OS_SESSION_SECRET",
  "OS_LOGIN_PASSWORD",
  "OS_BROWSER_SECRET",
  "OS_AGENT_TOKEN",
  "ANTHROPIC_API_KEY",
]);

export function childEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && !SECRET_VARS.has(k)) env[k] = v;
  }
  return env;
}
