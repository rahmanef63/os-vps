# os-vps (Topside) — Master Plan

> **os.rahmanef.com** — a mobile-first web cockpit for a single headless VPS,
> from any browser (especially a phone). Desktop/iOS-style UI metaphor over an
> rr-conventional **Next 16 + React 19 + Tailwind 4** stack. **Self-contained**:
> one Next.js app that runs *as a host process* and controls its own machine —
> no database, no external agent. Every feature is a portable **rr vertical
> slice** so it can be lifted into `resources/` and reused.

Status: **LIVE** — https://os.rahmanef.com (prod :4005) + demo (:4006). Repo:
`git@github.com:rahmanef63/os-vps.git`. Phases 0–14 done (see `PROGRESS.md`).
Brand: UI = **Topside**; repo/service/domain slug stays `os-vps`.

> **Architecture note (2026-05):** the original design (Convex self-hosted +
> Control-Room host-agent bridge) was **removed**. os-vps is now self-contained:
> `lib/host` does fs/exec/sys directly, `lib/auth` is a signed-cookie session.
> Sections below describe the current self-contained system. `DESIGN-RECONCILE.md`
> and early `PROGRESS.md` phases are kept as history of the old design.

---

## 1. Why this exists

We already run **VPS Control Room** (`vps-rahmanef` local / `control-room`
GitHub): a Termux-style PWA — multi-pane xterm terminals, a Node host agent with
an allowlist executor, host telemetry. Excellent, but it is a single dense
dashboard and is not an rr app, so its features can't lift into the slice catalog.

`os-vps` is the **rr-native sibling**: the same kind of capability (terminal,
files, telemetry, host ops, a real browser) re-expressed as an **app surface**
where each capability is a self-contained slice. Goals:

1. **Composable** — each app is an rr slice (`frontend/slices/<slug>/`),
   props-driven, lift-ready. Slices flow *up* to `resources/` and get reused.
2. **Lite + mobile-first** — it is a UI *metaphor*, not a real kernel. Snappy
   client-side window manager; the value is fast utility on a phone.
3. **Self-contained** — no DB, no agent, no systemd zoo. One Next.js app +
   `lib/host` + an optional Playwright browser service. Ship via Dokploy / a
   plain systemd unit.

## 2. Relationship to Control Room

| | VPS Control Room (`vps-rahmanef`) | os-vps / Topside (this project) |
|---|---|---|
| Metaphor | Termux dashboard | desktop/iOS surface (windows · dock · home) |
| Backend | Node host agent (HTTP/SSE) | none — the Next.js app **is** the host process |
| Host access | agent owns it (allowlist executor) | `lib/host` (fs/exec/sys, root-jailed) directly |
| Structure | monolith tiers | rr vertical slices (lift-ready) |
| Auth | HMAC single-secret cookie | password + device approval → HMAC signed cookie |
| Run as | systemd service | systemd / Dokploy, unprivileged user (NOT root) |

Host-access rule: the app runs **as an unprivileged user**, every host op goes
through `lib/host` (realpath-jailed roots, destructive-exec guard, audit log),
and `/api/v1` is gated by the session cookie. See `ARCHITECTURE.md`.

## 3. Scope — phased (history → current)

### Phase 0 — Foundation ✅
rr baseline (Next 16 · React 19 · Tailwind 4), `os-shell` window manager,
`system-monitor`, `os-terminal`, `lib/os-api` boundary, docs.

### Phase 1 — Design reconcile ✅
Adopted the `mock-os` (os-rr) macOS-style glass design into rr slices: tokens,
shell chrome (menu bar · dock · traffic-light windows · edge-snap), mobile shell.

### Phases 2–8 — Auth, ship, full app suite, dynamic registry ✅
Auth + persistence, deployed to os.rahmanef.com, the full 14-app suite, Spotlight
⌘K, dynamic app registry. *(Built on Convex at the time — later removed, below.)*

### Phases 9–14 — Parity, live host, real browser ✅
Every app lifted to ~full parity; **live host bridge** then **self-contained
host layer** (`lib/host` fs-write + exec + real telemetry); **real headless
browser** (Playwright `os-browser`) replacing the iframe proxy.

### Phase 15 — Self-contained + hardening + Topside ✅ (this era)
Convex + the external agent **removed** → single self-contained app
(`lib/host` + `lib/auth` signed-cookie). Security pass: audit log, exec
destructive-guard, tight FS scope, 24h sessions, threat-model README. UI
rebranded **os-vps → Topside** (dropped the "OS" overclaim). Files app: DnD
upload (files + folders, binary-safe), one-action New Folder, Spotlight folder
search, demo localStorage persistence, whole-window drop zone.

## 4. Open / remaining work

- **Mobile-responsive DRY layer** — *biggest open item.* `MOBILE-RESPONSIVE-PLAN.md`
  specifies shared primitives (`useResponsive`, `AppFrame`, `MasterDetail`,
  `ResponsiveToolbar`, `TouchList`) + per-app reflow. **Not yet built** — only
  the shell switch + a few `@container` slices exist.
- **Layout-kit tail** — assistant Skill/Agent/Automation forms and the browser
  HistoryView still use full-screen state-swap, not `FormDrawer` (low priority,
  `SHELL-LAYOUT-KIT.md`).
- **Lift to rr (Phase 4)** — metadata trio is hand-stubbed per slice
  (lift-ready), but no `rr-send` to `resources/` has run yet.

## 5. Performance contract (the "fast feel")

- Window drag/resize never re-renders the desktop (module store +
  `useSyncExternalStore`; only the dragged window subscribes to its rect).
- No backend on the hot path — `/api/v1` is hit on demand, not per frame.
- Apps lazy-mount; minimised windows keep state but pause render.
- `optimizePackageImports` for icon/radix barrels.

## 6. Guardrails (rr rules honored)

- `proxy.ts`, never `middleware.ts` (Next 16).
- Every `/api/v1` host op goes through `lib/host` (bounds + realpath checks) —
  never `fs`/`child_process` straight from a route. Every route `verifyAuth()` first.
- Secrets (`OS_SESSION_SECRET`, `OS_BROWSER_SECRET`, BYOK key) are server-only,
  never `NEXT_PUBLIC_*`. `.env.local` never committed.
- Max 200 lines/file; single responsibility; shadcn primitives; theme tokens not
  hex; mobile-first. Barrel-only cross-slice imports (`@/features/<slug>`).
- Solo-dev: push direct to `main` after green typecheck + build; conventional
  commits; AI co-author.

## 7. Open decisions / risks

- **Single-owner only.** No multi-user/tenant model. The device-approval gate +
  unprivileged run user are the security boundary; do not expose to the public
  without that understanding (see README threat model).
- **One-shot exec only** — no interactive pty (vim/top). By design.
- **Standalone, not monorepo** — paths mirror `resources/` so slices lift without
  rewrites; the rr-send step itself is still pending.
