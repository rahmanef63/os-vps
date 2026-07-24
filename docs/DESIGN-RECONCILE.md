# Design Reconcile — `mock-os` (os-rr) → os-vps

> **ARCHIVE (historical).** This records the Phase-1 decision to adopt the os-rr
> design + Cloud API contract. The **visual/design adoption still holds** (glass
> tokens, shell chrome, mobile shell, the `OsApi` mock↔http boundary). The
> **backend assumptions are obsolete**: Convex + the Control-Room agent bridge
> were later removed — os-vps is now self-contained (`lib/host` does fs/exec/sys
> directly, signed-cookie auth). For the current system read `ARCHITECTURE.md`.
> The "Revised architecture" diagram below is kept only as a record of the old plan.

The uploaded `mock-os/` is **os-rr**: a macOS-style browser shell prototype that is
*explicitly a VPS front-end*. It is not just a visual reference — it ships a
defined **Cloud API contract** (`mock-os/js/core/api.jsx` + `os-rr API.html`)
that is the single boundary between the desktop and a VPS daemon. This matches
os-vps's purpose and gives us the concrete agent-bridge spec Phase 2 needed.

## What os-rr is

- **Shell**: glass macOS aesthetic — 26px menu bar (logo + app menus + right
  status cluster + clock), bottom glass **dock** (52px glossy rounded-square
  icons, hover-lift, running dot, tooltip), draggable/resizable **windows** with
  traffic lights, **edge-snap** (halves + quadrants + top-maximize), minimize
  scale anim, boot screen.
- **Themes/tokens** (`css/os.css`): light + dark, accent swatches, `dir`
  presets (aqua / graphite / vivid), 5 wallpapers (aurora/dusk/mist/graphite/
  noir), `reduce transparency` a11y. All via CSS vars + `[data-theme]`.
- **Responsive**: container queries collapse app sidebars (540/430px); a
  **mobile shell** (`js/shell/mobile.jsx`) for phones; `device` tweak auto/desktop/phone.
- **Apps**: files, editor (code), media, video (reel), browser, preview,
  terminal, monitor, store, settings, assistant ("Alfa" AI), create-app.
- **AI layer** (`js/ai/*`): an in-OS assistant with tool calls + an OS context handle.
- **Persistence**: localStorage for windows/fs/apps/tweaks, with a boot-restore guard.

## The Cloud API contract (the part that matters most)

`makeApi({mode})` returns one of two adapters behind an identical interface:

- **MockAdapter** — in-browser simulation (Phase 0 demo, no VPS).
- **HttpAdapter** — real REST + SSE + WS to `{baseUrl}/api/v1`, Bearer auth.

Endpoint groups (`OSApi_ENDPOINTS`):

| Group | Endpoints | Maps to |
|-------|-----------|---------|
| `auth` | `POST /auth/token`, `GET /auth/me` | @convex-dev/auth (or agent token) |
| `fs` | list/stat/read/write/upload/mkdir/move/copy/remove/download/usage | agent fs allowlist → `file-manager` slice |
| `exec` | run, `stream` (SSE), kill, `pty` (WS) | agent pty manager → `os-terminal` slice |
| `sys` | stats, `stats/stream` (SSE), processes, process/kill | agent telemetry → `system-monitor` + `process-list` |
| `render` | start/status/stream/cancel/jobs | media (out of scope for VPS-lite) |
| `apps` | list/manifest/create/start/stop/remove/serve | Dokploy/agent app lifecycle → `docker-apps` |

This is the same boundary as the **Control Room agent's allowlisted HTTP API**.
So `HttpAdapter` ≈ a thin client over the Control Room agent (or an `os-rr`
daemon that wraps the same allowlist). No new host surface.

## Adoption decision — what we take vs leave

**Adopt (core, on-purpose for a VPS OS):**
1. **Design tokens** → rewrite `app/globals.css` with os-rr's light+dark glass
   tokens, accent, wallpapers, traffic-light colours, radii. (rr: tokens, no hex
   in components.)
2. **Shell chrome** → `os-shell` gains macOS **menu bar** (with live sys stats),
   glass **dock** (glossy icons + hover-lift + running dot), **window** traffic
   lights + **edge-snap** + maximize-restore + multi-edge resize.
3. **Mobile shell** → port `shell/mobile.jsx` behaviour (fullscreen app switch).
4. **`OsApi` abstraction** → add `lib/os-api/` with `MockAdapter` + `HttpAdapter`
   exactly per the contract. **This becomes the host hot-path boundary** —
   Convex stays for auth + persistence + reactive state; live host data
   (fs/exec/sys/pty) flows through `OsApi`→agent, NOT Convex (mirrors Control
   Room's "no Convex on the hot path").
5. **Tweaks/settings** → theme/accent/wallpaper/dir/reduce-glass/device + server
   mode (mock|live) + serverUrl + serverToken.

**Map to VPS apps (build as slices):** `files` (fs), `os-terminal` (exec/pty),
`system-monitor` + `process-list` (sys), `docker-apps` (apps lifecycle),
`os-settings` (tweaks), `assistant` (AI ops — later, ties to Control Room agents).

**Leave for now (not VPS-lite):** media studio, video reel editor, render
pipeline, generic browser. Keep the `render` API shape documented for parity but
don't build the UI.

## Revised architecture — OLD PLAN (superseded, kept for history)

> This was the Phase-1 plan. It is **no longer what ships.** Convex and the
> Control-Room agent are gone. Current architecture below + in `ARCHITECTURE.md`.

```
browser ── os-shell (window mgr, module store)
   ├─► Convex self-hosted   auth · windows layout · app catalog · telemetry history
   └─► OsApi (mock | live)
          └─ HttpAdapter ─► Control Room agent /api/v1 (allowlisted)
                 └─ fs · exec/pty · sys · apps   → host
```

### What actually shipped (self-contained)

```
browser ── os-shell (window mgr, module store)
   └─► OsApi (mock | live)
          ├─ MockAdapter  in-browser sim (demo; persists to localStorage)
          └─ HttpAdapter ─► same-origin /api/v1 (signed-cookie auth)
                 └─ lib/host → Node fs / child_process (root-jailed) → host
```

- **What carried over**: the `OsApi` mock↔http boundary, the glass design tokens,
  shell chrome, mobile shell, the os-rr endpoint *shape* (`fs/exec/sys`).
- **What changed**: no Convex (layout/registry → `localStorage`; device allowlist
  + config → `~/.os-vps/*.json`); no external agent (the Next.js app *is* the host
  process); auth is a password + device-approval HMAC signed cookie, not
  `@convex-dev/auth`; the browser is real Playwright (`os-browser`), not a proxy.
- **Still demoable with zero host**: `OsApi` defaults to `MockAdapter`.

## rr-compliance notes for the port

- The prototype is one-file-per-app plain JSX on `window.*` globals. We **do not**
  copy that style — we re-author into rr vertical slices (`frontend/slices/<slug>/`),
  shadcn primitives, ≤200 lines/file, theme tokens. The prototype is the spec,
  not the source.
- Traffic-light buttons, menus, context menus → wrap shadcn (`DropdownMenu`,
  `Button`) rather than raw elements.
- `OsApi` types live in `lib/os-api/types.ts`; each adapter ≤200 lines (split by
  group if needed).
