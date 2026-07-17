# Security Policy

os-vps (Manef Shell OS) is a **personal, single-owner tool, alpha quality**. It has had
internal adversarial review but **no third-party security audit**. Read the
[Threat model](./README.md#threat-model) and
[Security model](./README.md#security-model-mechanics) in the README before
deploying — an authenticated session is an effective remote shell on your box,
by design.

## Supported versions

Only the latest commit on `main` is supported. There are no release branches.

## Reporting a vulnerability

- **Preferred:** open a [GitHub Security Advisory](https://github.com/rahmanef63/os-vps/security/advisories/new)
  (private disclosure).
- Or email **casadezian@gmail.com** with subject `os-vps security`.

Please include reproduction steps and which part of the documented threat model
the issue violates. Expect a reply within a week (solo maintainer).

## Out of scope

- Anything requiring an already-authenticated session to do what the README
  says a session can do (run commands, read/write inside configured roots) —
  that is the product, not a vulnerability.
- The destructive-command guard in `lib/host/exec.ts` is an **accident
  tripwire, not a sandbox** — bypassing it with shell tricks is expected and
  documented.
- Spawned shells (exec + PTY) run with the app's own secrets stripped from their
  environment (`lib/host/child-env.ts`), so a casual `printenv` in the terminal
  won't reveal `OS_SESSION_SECRET` / `OS_LOGIN_PASSWORD` / the BYOK key. This is
  defense-in-depth, **not** a boundary: a same-UID process can still read
  `/proc/<pid>/environ` of the os-vps process itself. The real boundary is the
  OS user the app runs as — keep it unprivileged and dedicated.
- User-pasted **live wallpaper HTML** (Settings → Wallpaper → Custom HTML) runs
  in an iframe sandboxed with `allow-scripts` ONLY — no `allow-same-origin`, so
  it executes in an opaque origin: it cannot read the OS cookies/localStorage,
  reach the parent DOM, or call `/api/*` as the signed-in user. It is never
  injected into the OS DOM. The value is size-capped and shape-validated on
  every hydrate/sync path (`lib/appearance/wallpapers.ts`).
- Deployments that ignore the minimum security checklist (no TLS/VPN, `/` as a
  read root on a public box, weak `OS_SESSION_SECRET`).

## In scope (examples)

- Auth bypass: session forgery without `OS_SESSION_SECRET`, device-approval
  bypass, rate-limit defeat that enables practical brute force.
- Filesystem jail escape: reading/writing outside `OS_FS_READ_ROOTS` /
  `OS_FS_WRITE_ROOTS`, or reaching the credential denylist
  (`.env*`, `~/.os-vps/*`) through the FS API.
- Unauthenticated access to any `/api/v1`, `/api/assistant`, `/api/config` or
  `/api/auth/devices` route.
- CSRF/clickjacking that triggers exec/fs actions cross-origin despite the
  `SameSite=Strict` cookie + `Sec-Fetch-Site` proxy check + `frame-ancestors`.

## Rotating the BYOK Anthropic key

The Anthropic API key for the Alfa assistant is owner-supplied (BYOK) and lives
**only** on the server in `~/.os-vps/config.json` — it is never embedded in the
client bundle and never returned by any `/api` route. To rotate:

1. Stop the app (`systemctl stop os-vps` or your runner equivalent).
2. Edit `~/.os-vps/config.json` and replace the `anthropicApiKey` value.
3. Restart. The next assistant request picks up the new key on its first call
   to `resolveApiKey()` — no client-side cache to clear.

## Audit log retention

The append-only JSONL trail at `~/.os-vps/audit.log` (or `$OS_AUDIT_LOG`) grows
unbounded. Operators handling regulated data (e.g. GDPR data-minimisation
duties) should rotate it. Example `logrotate(8)` snippet:

```
/home/<user>/.os-vps/audit.log {
  size 1M
  rotate 4
  compress
  missingok
  copytruncate
}
```

`copytruncate` is required because the app keeps the file open via the
append chain in `lib/host/audit.ts`.

## HSTS

The app does **not** emit `Strict-Transport-Security` itself — app-layer HSTS
is redundant with proxy HSTS and dangerous to misconfigure (a stale
`max-age` from the app can outlive a deployment change). The operator MUST
set HSTS at the reverse-proxy / TLS-terminator layer:

- **Caddy:** `header { Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" }`
- **nginx:** `add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;`

Why it matters: the session cookie is `Secure` + `SameSite=Strict`, so it
already refuses to ride plain HTTP. HSTS pins the browser to HTTPS on every
subsequent visit, blocking downgrade attacks (sslstrip) on the first hop
and on any subdomain that could be tricked into serving HTTP.
