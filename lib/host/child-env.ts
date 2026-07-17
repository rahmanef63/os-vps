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

// Non-secret app config a spawned shell may legitimately keep (the FS-jail roots).
const SAFE_OS_VARS = new Set(["OS_FS_READ_ROOTS", "OS_FS_WRITE_ROOTS"]);

// Deny by SHAPE, not just an explicit list, so a newly-added secret (a new BYOK
// provider key, OS_UNSPLASH_ACCESS_KEY, MODELS_LIVE_*_KEY, an encryption key…)
// doesn't silently leak into every terminal/exec child: strip every app var
// (OS_* except the FS-root config) plus any name ending in a secret-shaped suffix.
function isSecretVar(k: string): boolean {
  if (SECRET_VARS.has(k)) return true;
  if (k.startsWith("OS_") && !SAFE_OS_VARS.has(k)) return true;
  return /(_SECRET|_TOKEN|_PASSWORD|_KEY)$/i.test(k);
}

export function childEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && !isSecretVar(k)) env[k] = v;
  }
  return env;
}
