# os-vps (Topside) — Architecture

> **Current.** Reflects the self-contained app as shipped. The earlier Convex +
> Control-Room-agent design (see `DESIGN-RECONCILE.md`, early `PROGRESS.md` phases)
> was removed: os-vps now runs **as a host process** and talks to its own machine
> directly. No database, no external agent.

## What it is

A single Next.js 16 app that you run on a VPS as a normal (non-root) user. It
serves a desktop/iOS-style web UI and exposes a small host API (`/api/v1`) that
does fs / exec / sys work straight through Node `fs` + `child_process`, bounded
by realpath-checked roots. Auth is a signed-cookie session. Optional Playwright
service powers the Browser app.

```
phone / browser ──https──> os-vps (Next.js :4005) ──┬── lib/host → Node fs / child_process (host, non-root)
                  signed-cookie auth (lib/auth)       └── os-browser (Playwright :4002, loopback, optional)
```

## Layout (mirrors `resources/` so slices stay lift-ready)

```
os-vps/
├── app/                      Next 16 App Router
│   ├── layout.tsx            fonts + theme + providers
│   ├── globals.css           Tailwind 4 + glass theme tokens
│   ├── page.tsx / os-root.tsx mounts <OsDesktop/> behind the auth gate
│   └── api/
│       ├── v1/               host Cloud API — fs · exec · sys · term · stock · browser
│       ├── auth/             login · logout · me · devices
│       ├── config/           BYOK AI key (read/write ~/.os-vps/config.json)
│       └── assistant/        Claude SSE stream (BYOK)
├── components/ui/            shadcn (new-york) primitives — app-wide
├── components/shared/        cross-slice primitives (file-tree, …) via @/shared/*
├── lib/
│   ├── host/                 THE host facade — every /api/v1 route goes through here
│   │   ├── fs.ts             list/read/write/mkdir/move/copy/remove/usage/upload/search
│   │   ├── exec.ts           one-shot shell + destructive-command guard
│   │   ├── pty.ts            interactive PTY sessions (node-pty) behind /api/v1/term/*
│   │   ├── sys.ts            cpu/mem/disk/uptime/processes
│   │   ├── host-error.ts / api-error.ts  HostError + apiError + readJson/requireString kit
│   │   ├── paths.ts          read/write root jail + realpath bounds check
│   │   ├── audit.ts          append-only JSONL audit (~/.os-vps/audit.log)
│   │   ├── rate-limit.ts     fixed-window in-memory limiter
│   │   └── index.ts          barrel
│   ├── auth/                 session.ts (HMAC sign/verify) · require-session.ts ·
│   │                         device-store.ts (~/.os-vps/auth-devices.json)
│   ├── config/               store.ts (~/.os-vps/config.json — BYOK key + model)
│   ├── agent/                server.ts — server-only client for the os-browser service
│   ├── os-api/               the UI ↔ host boundary: types · MockAdapter · HttpAdapter
│   ├── ai/                   Claude stream helper
│   ├── appearance/           theme/accent/dir/wallpaper/server-mode store
│   └── demo.ts               IS_DEMO flag (NEXT_PUBLIC_OS_DEMO=1 → force mock)
├── frontend/slices/<slug>/   app slices (UI + types + config + metadata trio), plus:
│   ├── appshell/             generic shell framework — <AppShell manifest>, window
│   │                         runtime, desktop+mobile surfaces, registries, ResponsiveProvider,
│   │                         primitives, pub/sub buses. Brand/feature-agnostic → lifts to rr.
│   ├── shell-search / shell-inspector / shell-notifications / shell-control-center /
│   │                         shell-widgets   pluggable features mounted via <Slot region>
│   └── os-shell/             os-vps consumer: shell.manifest.ts (brand+apps+features)
│                             + re-export barrel (@/features/os-shell)
├── os-browser/               Playwright Chromium service (gitignored, deploy-local)
├── public/demo-media/        real sample media so the mock demo can open files
├── scripts/                  approve-device.js · gen-demo-media.mjs · …
└── docs/  proxy.ts  next.config.mjs  tsconfig.json ...
```

Path aliases (tsconfig): `@/*` → root, `@/features/*` → `frontend/slices/*`,
`@/shared/*` → `components/shared` + `lib/shared`. Same shape as `resources/` so
a slice lifts by copy, no rewrite.

## Runtime — one tier

There is no backend tier. The browser hits same-origin route handlers; the
handlers call `lib/host`; `lib/host` touches the kernel. That's it.

```
browser
  │  React 19 + os-shell window manager (module store, drag/resize 100% client)
  ▼
/api/v1/*   Next route handlers (server)         every route: verifyAuth() first
  │  fs · exec · sys · term · stock · browser
  ▼
lib/host    fs / child_process, root-jailed, realpath-checked, audited, rate-limited
  ▼
host kernel (as the unprivileged service user — NOT root)
```

- **Hot path is client-only.** Window drag/resize never re-renders the desktop:
  state lives in a module-level store read via `useSyncExternalStore`; only the
  dragged window subscribes to its own rect.
- **Persistence is local.** Window layout + installed-app registry → `localStorage`
  (the demo also persists its mock FS to `localStorage`, key `os-vps:demo-fs`).
  Device allowlist → `~/.os-vps/auth-devices.json`; BYOK key/model →
  `~/.os-vps/config.json`; audit trail → `~/.os-vps/audit.log`.
- **Apps lazy-mount.** A window mounts its app component only when opened.

## The host boundary — `lib/host` + `lib/os-api`

`lib/os-api` is the UI-facing contract (os-rr Cloud API shape): one `OsApi`
interface, two adapters —

- **MockAdapter** — in-browser simulation. Default + forced when `IS_DEMO`. The
  whole OS is demoable with zero host.
- **HttpAdapter** — `fetch` to same-origin `/api/v1`, used in **Live** mode
  (Settings → Server). Sends the session cookie; no token in JS.

Server side, **every `/api/v1` route calls `verifyAuth()` then goes through
`lib/host`** — routes never call `fs`/`child_process` directly. `lib/host`
enforces:

- **FS jail** — `OS_FS_READ_ROOTS` / `OS_FS_WRITE_ROOTS` (default: home + `~/projects`).
  Symlinks are realpath-resolved **before** the bounds check; a root dir itself
  refuses writes. READ may be widened to `/` (read-only browse) without widening WRITE.
- **Exec guard** — `destructiveReason()` refuses catastrophic commands
  (`rm -rf /`, `mkfs`, `dd of=/dev/…`, fork bomb, `chmod/chown -R /`) unless
  `OS_EXEC_ALLOW_DESTRUCTIVE=1`. Exec itself stays one-shot — the interactive
  shell is the PTY (below).
- **Rate limit** — exec is fixed-window limited per device.
- **Audit** — exec/fs-mutation/term/browser/auth actions append to the JSONL log.

### Terminal PTY — `/api/v1/term/*`

Live Terminal sessions are real PTYs (`node-pty`), managed by `lib/host/pty.ts`:
spawn the owner's login shell, stream output as SSE (`/api/v1/term/stream`,
ring-buffered so a `Last-Event-ID` reconnect resumes exactly where it dropped),
plus `open`/`input`/`resize`/`close` routes. 8 concurrent sessions max, 30-min
idle reap; `term.open`/`term.close` are audited (keystrokes are not — high
volume, and the owner has a full shell by design). The exec destructive filter
does **not** apply here, by design: a pty carries raw keystrokes with no command
boundary to inspect, and an interactive shell composes commands from fragments
anyway — the gate is the same signed session + approved device as every route.
Mock mode never touches it; if the PTY fails the Terminal app falls back to
one-shot exec.

### Stock search — `/api/v1/stock/search`

A thin server-side proxy for the image picker's Stock tab: keyless **Openverse**
by default, **Unsplash** when `OS_UNSPLASH_ACCESS_KEY` is set. The key never
reaches the client.

### API error contract

Every `/api/v1` route returns errors as `{ error: string }` via `apiError()`
(`lib/host/api-error.ts`): curated `HostError` messages pass through as 400
(they're client-safe UX); everything else is masked to "Operation failed" and
logged server-side with the route name, so raw Node errors (ENOENT/EACCES with
absolute paths) never leak. Inputs are validated by a dependency-free
`readJson`/`requireString`/`requireInt` kit — no zod.

## Auth (`lib/auth`)

Signed-cookie sessions — no Convex, no Clerk.

- **Factor 1**: `OS_LOGIN_PASSWORD` (weak/memorable), checked constant-time.
- **Factor 2**: the device must be in the approved allowlist
  (`~/.os-vps/auth-devices.json`). A correct password on a new device registers
  it `pending`; **no session is issued until approved**
  (`node scripts/approve-device.js <deviceId> "name"`).
- On success: an HMAC-SHA256 cookie signed with `OS_SESSION_SECRET` (≥32 bytes),
  `httpOnly` + `Secure` + `SameSite=strict`, default 24h.
- `requireSession()` verifies signature + expiry only (device approval is a
  login-time gate, not re-checked per request). `getSessionActor()` → `device_id`
  for the audit trail.

## Browser app (`os-browser`, optional)

A separate Playwright Chromium service (`os-browser/`, systemd, **loopback**
:4002, gitignored). `lib/agent/server.ts` proxies the `/api/v1/browser/*` routes
to it (secret-gated, server-only). Renders any site, drivable from the UI, with
a persistent profile (`~/.os-vps/chrome-profile`) so logins stick. Leave
`OS_BROWSER_URL`/`OS_BROWSER_SECRET` unset to disable the app — everything else
still works.

## Deployment

- **prod** — `os-vps.service` :4005 (systemd, `User=rahman`, WorkingDir
  `/home/rahman/projects/os-vps`).
- **demo** — `os-vps-demo.service` :4006 (`NEXT_PUBLIC_OS_DEMO=1`, separate
  WorkingDir `/home/rahman/projects/os-vps-demo`, mock-only, no host access).
- **os-browser** — `os-browser.service` :4002 (loopback).

Ship: commit to `main`, push (pre-push hook runs typecheck + lint CI), then
restart prod + sync/rebuild demo manually.
