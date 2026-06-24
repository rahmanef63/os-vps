# Changelog

All notable changes to Topside (repo: `os-vps`) are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Phase entries map to `docs/PROGRESS.md`; git SHAs cross-reference each section.

---

## [Unreleased]

- Shell fidelity Phases D-F (per-shell signature behaviours: macOS Spaces strip,
  Win11 snap-layouts popup + Alt-Tab, iOS zoom-from-icon, Android notification
  shade + ripple) not yet started.
- `MOBILE-RESPONSIVE-PLAN.md` Phase E full adoption across all app UIs deferred
  (primitives built in `appshell/primitives/`, rollout not yet done).

---

## 2026-06-24

### Security / Accessibility
- `cb6f1d3` Spotlight upgraded to a proper ARIA combobox (`role=combobox`,
  `aria-expanded`, `aria-activedescendant`, live region for screen-readers).
  Rate-limit added to all FS write routes (`/api/v1/fs/{write,mkdir,delete,
  move,copy}`) using the existing `rateLimit` helper.

---

## 2026-06-23

### Refactor
- `e78111d` Next 16 / React 19 best-practice pass: `forwardRef` -> plain props,
  `useFormStatus`, `use()` for context — based on audit-bp findings.
- `5617891` Dedup URL-to-home derivation, native `roundRect` canvas API (removes
  hand-rolled polyfill), converge `inEditable` helper.
- `9385333` Ponytail audit: prune dead code, dead deps, and hand-rolled stdlib
  equivalents across the codebase.

---

## 2026-06-15 — Upload DoS P0 + code quality

### Security (P0)
- `b4b90c5` `fs/upload` no longer buffers every multipart part into RAM.
  New `lib/host/multipart.ts` streaming parser + `lib/host/fs-upload.ts`
  spool-to-tmp with backpressure + atomic rename within write-root bounds;
  `proxyClientMaxBodySize` 500 MiB -> 256 MiB. Closes authenticated DoS where
  an upload could OOM-kill the host process that is the cockpit.
- `4ddc70f` Cap raw pulled bytes (oversized preamble/header bypass); add
  `lib/host/multipart.test.ts` (6 tests including both bypass vectors).
  293 tests passing, tsc clean.

### Code Quality
- `04b7aa1` image-picker file renamed to kebab-case; ESLint cross-slice barrel
  guard added; `AppChrome` component documented.
- `40b24d8` README refreshed: config table, ops section, shell-features
  convergence notes.

---

## 2026-06-14 — Audit loop T2-T8 (audit-bp independent review)

Eight-tick cleanup over `AUDIT-2026-06-11.md`. Gates green at every tick
(typecheck / lint / vitest).

### Added
- `cf0ed9f` **T2 a11y + tests** Pinch-zoom restored, menus roled, icon-buttons
  labeled. +19 tests (201 total).
- `d11b997` **T3 UX error doctrine** Shared toast bus across 5 new adoption
  sites. `window.confirm` + naked destructive ops replaced by `ResponsiveDialog`
  + undo. 7 confirmation regimes unified to 1.
- `b1ea15e` **T4 focused hotkey + hygiene** `useFocusedHotkey()` primitive;
  8 stale Convex-era `slice.json` files cleaned; Radix imports scoped per-app.
- `093759b` **T5 WindowPreview + agent scope** Generic `<WindowPreview>`
  primitive (shell fidelity Phase C) kills mobile-switcher double-PTY bug.
  `OS_AGENT_TOKEN` scoped to `/api/v1/browser/*` only.
- `3772ff8` **T6 perf + mobile** Reel frame-store (~6x re-render drop);
  image-editor Blob history (3-5x memory drop); 3 apps migrated to
  `MasterDetail`/`AppFrame` primitives.
- `b1255ee` **T7 HMAC + HSTS** `constantTimeEq` length-leak closed; HSTS
  documented in `INSTALL.md`; +23 tests (244 total).
- `3af3b3b` **T8 virt + queue + tokenize** Files list virtualized (~25-40x
  DOM node drop); `lib/host/audit` writes serialized through a chained promise
  queue (no concurrent-write corruption); code-editor incremental tokenize;
  smoke-test scaffold added.

### Security (from audit-bp P1/P2 findings)
- `bfbbf8f` 4 P1 findings closed (details in `AUDIT-2026-06-14.md`).
- `38e483a` 5 P2 findings closed: proxy strict mode, `forwardRef`->prop,
  200-LOC enforcement, threat model update.
- `2bb574d` 6 P2/P3 findings closed: CSP nonce, structured meta tags, ops docs.

### Refactor
- `f9e1980` Finish appshell convergence: `DashboardShell` lifted into framework,
  feature metadata shed, `rr.json` contract parity.
- `f48440e` 10 `shell-*` slices converged into `appshell/features/*` (rr-nested
  canonical shape).

---

## 2026-06-13

### Refactor
- `4ae5e05` Host I/O port relocated into appshell; app slices made 3-alias clean.

---

## 2026-06-12

### Added
- `3df4665` Reliable bulk upload with progress indicator; code-editor CDN preview.

### Fixed
- `1292f45` Code-editor seed buffer preserved in mock mode so demo Preview
  shows real code.

---

## 2026-06-11 — Full audit + shell fidelity Phases A+B

### Added
- `f31b893` **Shell fidelity Phase A** Per-shell design tokens: `data-shell={id}`
  on Surface root; CSS defines `--shell-font/-radius-win/-radius-ui/-icon-radius/
  -ease/-dur-*` with per-OS overrides (macOS/iOS, Windows 11, Android).
- `f31b893` **Shell fidelity Phase B** Window lifecycle motion: `winOpen`/
  `winClose`/`winMin` CSS animations; `.win-geo` glides for maximize/snap/restore;
  drag and resize hooks set `transition:none` mid-gesture;
  `prefers-reduced-motion` collapses to ~1 ms.
- `82aeaaa` Dynamic per-shell context menu registry
  (`appshell/lib/context-menu.ts`): `registerContextMenu(ShellId|"*", provider)`.
  Wired into all 5 shells. Fixed latent bug: Windows desktop menu was shadowed
  by the window section.
- `82aeaaa` Live/interactive wallpaper: TSX registry
  (`appshell/lib/wallpaper-registry.ts`) with Drift + Starfield built-ins;
  HTML sandboxed iframe source (opaque origin, `sandbox="allow-scripts"` only);
  "receives clicks" toggle makes the wallpaper interactive beneath windows.

### Fixed (audit wave 1-4, `89f4210`)
- **App P0s**: image-editor export renders at doc resolution (not viewport);
  failed project load no longer clobbers file; Settings SSH target now editable;
  code-editor Cmd+S saves instead of opening browser dialog; Files Download
  actually downloads.
- **App P1s**: files rename-collision guard + failed-listing error state;
  image-editor delete/duplicate keep paint pixels; code-editor stale-buffer /
  dirty-tab close guard; assistant abort seam end-to-end (Stop button,
  `req.signal`, no token bleed); browser unmount closes remote pages.
- **Shell core**: resize commits via `offsetLeft/offsetTop` (no +30px drift);
  Spotlight `useSearch` memoized (no infinite loop); pollers gated on
  `document.hidden`; `hydrateBoot` dedupes multi-app windows by payload;
  restored windows clamped on-screen; window stacking + Cmd+Tab + close-focus
  follow z-order (recency, not creation).
- **Security**: sensitive-file denylist extended (`.aws/.kube/.docker/
  .config/gcloud/.netrc/.git-credentials/*_history`); spawned shells run
  with app secrets scrubbed from env (`lib/host/child-env.ts`) so `printenv`
  no longer leaks the session secret or BYOK key.

---

## 2026-06-10 — rr sync wave + multi-shell parity + font pipeline fix

### Added
- `c45b76e` **Android shell rebuilt for parity**: pull-DOWN opens real Control
  Center; `usePullDown` shared hook (fires at threshold, pointercancel-safe,
  scroll-aware); transparent root shows `<Wallpaper>`; deep links work.
  Resume-don't-duplicate on iOS + Android (home tap focuses existing window,
  never spawns a second one).
- `c45b76e` **Dashboard shell store-driven**: panes are real store windows
  (`openWindow`/`minimizeWindow`); URL sync, deep links and title sync work;
  Running sidebar + app filter added.
- `c45b76e` **Windows shell**: Cmd+Tab AppSwitcher + NotificationCenter mounted;
  F3 Task View via `use-overview-key` hook; Start menu closes on Esc.
- `c45b76e` **macOS**: Launchpad live search + `inert` while closed;
  desktop context menu gains "Close all"; Launchpad z-index collision fixed.
- `ef771f3` Theme presets own the typeface: `applyPreset()` injects one Google
  Fonts link for the preset's named families; `clearPreset()` removes it.
- `076c7b3` Two root-cause font bugs fixed: Geist `variable` classes moved to
  `<html>` (were on `<body>` -> guaranteed-invalid CSS var); self-referential
  `--font-mono` CSS var cycle broken (token renamed `--font-mono-ui`).
  Custom fonts now actually render for the first time.
- `84e857c` Full upstream sync to rr: appshell 1.4.0 byte-synced, all 10 shell
  features, 12 app slices upgraded (3-way merges), 3 new lifts (media-studio
  1.0.0, quicklinks 1.0.0, shell-settings 1.0.0).

### Removed
- Wallpaper presets (aurora/dusk/mist/graphite/noir picker grid) retired from
  Settings -> Appearance. Theme presets own color identity. Legacy stored keys
  coerce to "auto" on every hydrate path.

---

## 2026-06-09 — Mobile maximized, PTY terminal, stock search, API hardening

### Added
- `4b7cf04` **Cross-device prefs sync**: wallpaper/theme/server-mode/quicklinks
  persist to `~/.os-vps/prefs.json` (atomic, mode 0600) via session-gated
  `/api/prefs`; localStorage hydrates first, server wins on initial GET;
  debounced 1.5 s POST per section. POSTs blocked until GET succeeds.
- `ce97b6a` **Terminal touch key bar**: accessory row for PTY on
  `pointer:coarse` devices; Esc, Tab, sticky Ctrl/Alt (arms next key-bar press
  or next soft-keyboard char via xterm `onData` intercept), arrows,
  Home/End/PgUp/PgDn, ^C ^D ^L ^Z, `| ~ / -`, clipboard paste.
- `6ab3baf` **Real interactive PTY** (`node-pty` + `@xterm/xterm`): session
  manager with ring buffer + `Last-Event-ID` resume, 8-session cap, 30-min
  idle reap; SSE bridge at `/api/v1/term/{open,stream,input,resize,close}`.
  vim, top, ssh all work in live mode; mock falls back to one-shot exec.
- `9c90d7f` **Stock photo search**: `/api/v1/stock/search` — keyless Openverse
  by default, optional `OS_UNSPLASH_ACCESS_KEY` -> Unsplash (key stays
  server-side). image-picker "Stock" tab live with debounce/attribution.
- `b9e7da4` **PWA**: manifest shortcuts, install prompt, viewport-fit; mobile
  home-bar swipe gestures (home/switcher/switch-app).
- `3e7c4c1` Quicklinks (website shortcuts) in Settings/dock/Launchpad/mobile/
  Today widget + dedicated Quicklinks window.
- `dec2c5f` **API hardening**: `HostError` + `apiError` across all 35 `/api/v1`
  routes; raw Node errors (ENOENT/EACCES paths) masked to "Operation failed";
  dependency-free input validation kit (`lib/host/api-error.ts`); `verifySession`
  requires numeric `expires_at`. Tests 41 -> 124.
- `79a5382` **Responsive sweep Phase 3+4**: browser, media-viewer, image-editor,
  reel-editor, app-store, create-app, assistant all reflow container-first
  (`useContainer`/`@container`); no new `matchMedia` calls.
- `6f78a48` tweakcn preset picker, semantic status tokens, macOS-style Settings nav.

### Fixed
- `9bf592f` Mobile Done resets URL: UrlSync now keys off visible (focused AND
  not-minimized) app; dismiss -> `replaceState("/")`; covers Android home button.
- `29bc59b` Persisted layout no longer wipes deep-link windows: `hydrateBoot()`
  merges (live windows keep id/payload/focus on top; persisted single-instance
  dupes drop; multi apps coexist via id remap).
- `b4a86a3` SVG sandbox, device-revocation session check, CSS url-escaping;
  hardcoded username purged from source code.
- `28ede6f` "New version" PWA toast now fires on mobile: service worker bakes
  `BUILD_ID` into cache name so its bytes change every deploy.

---

## 2026-06-08 — Settings polish

### Added
- `20ca14e` Unified appearance controls in Settings.
- `13730ad` Server target tabs in Settings.

---

## 2026-06-07 — appshell 1.3.0 + browser CDP screencast + a11y + host hardening

### Added
- `f3f9117` **appshell 1.3.0** (F1-F20 window-manager wave ported from rr):
  snap zones, maximize/restore geometry, `workArea()`, z-ladder,
  dock hover window preview, `useOverviewKey`, `usePullDown`, `HomeIndicator`,
  shared `Clock`.
- `5e5479f` 5 new shell feature slices; Today widgets + Spotlight search upgrades.
- `c62889a` All 1.3.0 features wired into Topside (`os-shell`).
- `0c67e50` vitest infra + headless e2e harness (7 checks green).
- `8f489ad` Browser live CDP screencast stream (JPEG frames over SSE,
  heartbeat, crash-guard).
- `4663fec` Real-Chrome CDP channel (fixes Google sign-in); snappier input.
- `d7b4d6e` Browser multitab + AI agent-activity panel.
- `77208c7` A11y: text scale, high contrast, reduce-transparency commands;
  Focus tile in Control Center.
- `cd1fd40` Sensitive-home denylist: `.ssh/.gnupg/.secrets/vault/
  .bash_history/.npmrc`.
- `807d651` Destructive exec guard covers power/service control commands.
- `e853965` Terminal honest live mode: real fs/host data, no silent mock fallback.
- `db821d5` macOS Ventura-style app icons.

---

## 2026-06-06 — v0.1: Topside multi-shell OS

### Added
- `0460606` **Topside v0.1** initial commit. Next 16 + React 19 + Tailwind 4 +
  shadcn/ui. Signed-cookie HMAC auth (password + device approval). `lib/host/`
  (fs/exec/sys) as the single facade for all `/api/v1` routes. Window manager
  with snap/maximize, glass dock, Spotlight (Cmd+K), 12 built-in apps (Files,
  Terminal, Code Editor, Browser, System Monitor, Image Editor, Media Studio,
  Reel Editor, Media Viewer, App Store, Assistant, Settings). 5 shells
  (macOS, Windows 11, Android, iOS, Dashboard). Mock + live modes.
- `e62cbbf` react-hooks v6 compliance sweep: 55 warnings -> 0, rules promoted
  to error.

---

## Historical — Phases 0-18 (2026-05-29 — 2026-05-31)

> These phases ran on Convex self-hosted + an external Control-Room host-agent
> bridge. That entire stack was removed in Phase 15. Entries are kept for
> archaeology; `ARCHITECTURE.md` is the current truth.

- **Phase 0** (2026-05-29) Scaffold: Next 16 + React 19 + Tailwind 4 +
  Convex self-hosted. os-shell window manager, system-monitor, os-terminal.
- **Phase 1** (2026-05-29) Design reconcile: `lib/appearance`, glass tokens,
  menu bar, dock, traffic-light windows, files-manager, os-settings.
- **Phase 2** (2026-05-29) Auth + Convex persistence: `@convex-dev/auth`
  password gate, device-approval model, window layout persisted to Convex.
- **Phase 3** (2026-05-29) Initial deploy: os.rahmanef.com live. Live host
  bridge coded locally but prod reachability deferred.
- **Phase 4** (2026-05-29) Full app suite: 8 new app slices (code-editor,
  media-studio, reel-editor, browser, media-viewer, app-store, create-app,
  assistant). 12 total apps.
- **Phase 5** (2026-05-29) Spotlight Cmd+K command palette.
- **Phase 6A** (2026-05-29) Device-approval auth hardened: two-factor
  (password + approved device), `pending` state gate, bootstrap CLI path.
- **Phase 6B** (2026-05-29) BYOK AI assistant: real Claude SSE stream via
  Anthropic SDK, BYOK key in Convex config, Settings -> AI panel.
- **Phase 7** (2026-05-29) App parity sweep (6 thin apps -> ~80%) + live VPS
  file listing enabled (agent rebound, docker_gwbridge firewall rule).
- **Phase 8** (2026-05-29) Dynamic app registry: `openWindow` payload,
  Convex `features/apps`, runtime-installable apps, toast system.
- **Phase 9** (2026-05-29) Full parity sweep: 7 apps raised to ~85-90%
  depth (reel-editor, media-studio, assistant, media-viewer, files-manager,
  os-settings, mobile shell).
- **Phase 10** (2026-05-30) Live backend: fs write + exec + reel-editor real
  Canvas render. Parity ~100% depth.
- **Phase 11** (2026-05-30) Shared live file-tree component; AI Inspector
  (14 apps publish live state + actions, right-docked Properties + AI tabs).
- **Phase 12** (2026-05-30) Deep VPS tree browsing, dynamic favorites,
  browser proxy.
- **Phase 13** (2026-05-30) Browser fix (token-race + in-page nav); full
  13/13 API audit on prod.
- **Phase 14** (2026-05-30) Real headless Chromium via Playwright
  (`os-browser` service, loopback :4002, persistent Chrome profile).
- **Phase 15** (2026-05-30) **Architecture pivot**: dropped Convex + external
  agent. `lib/host/` is the direct host facade. Signed-cookie HMAC auth.
  Topside rebrand. os-browser rebound to loopback 127.0.0.1.
- **Phase 16** (2026-05-30/31) Files CRUD + DnD upload: binary-safe DnD,
  one-action New Folder, Spotlight folder search, demo FS persists to
  localStorage, whole-window drop zone.
- **Phase 17** (2026-05-31) AppShell framework: monolithic os-shell split
  into generic brand-free `appshell` + pluggable feature slices + thin
  `os-shell` consumer. `<AppShell manifest>` entry point. `<Slot region>`
  composition. `ResponsiveProvider` + 4 DRY primitives. `ShellCapabilities`
  injection makes the entire framework consumer-free.
- **Phase 18** (2026-05-31) Addressable OS: catch-all route
  `app/[[...slug]]`, `UrlSync` mirrors focused app to URL,
  `window.history` API (not `router.push`), slugs centralised in manifest,
  `<Link>` anchors with `prefetch={false}`, per-route `generateMetadata`.
