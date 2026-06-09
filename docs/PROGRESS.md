# os-vps — Progress Log

Running log of what shipped each phase. Newest at top.

> **Architecture note:** Phases 0–14 below were built on **Convex self-hosted +
> a Control-Room host-agent bridge**. That stack was **removed** in Phase 15 —
> os-vps is now a self-contained Next.js app (`lib/host` + signed-cookie auth).
> Read those phases as history; `ARCHITECTURE.md` is the current truth.

---

## 2026-06-09 (round 2) — Mobile maximized: prefs sync · terminal key bar · deep-link fixes (DONE)

Phone testing surfaced the real gaps — everything below e2e-verified on prod
(Playwright login + device approval at 390×844, then revoked).

- **Cross-device prefs sync** (`4b7cf04`): phone no longer boots to fresh
  defaults (wrong wallpaper/theme, empty quicklinks, mock mode). Appearance
  tweaks + quicklinks persist to `~/.os-vps/prefs.json` (atomic 0600) via
  session-gated `/api/prefs` (mirrors `/api/config`). localStorage hydrates
  first, server wins on initial GET, changes debounce 1.5 s POST per section,
  last-write-wins. POSTs disabled until a GET succeeds (pre-auth defaults can
  never clobber server prefs); login fires `os-vps:authed` to re-pull without a
  reload. `wallpaperStyle` is computed → stripped both sides. Demo: zero calls.
  Device-specific state (window layout, clipboard, profiles, recents) stays
  local on purpose.
- **Terminal touch key bar** (`ce97b6a`): control-room-style accessory row for
  the PTY terminal — Esc, Tab, sticky Ctrl/Alt (arms next key-bar press OR next
  soft-keyboard char via xterm `onData` intercept; Alt = ESC-prefix), arrows,
  Home/End/PgUp/PgDn, ^C ^D ^L ^Z, `| ~ / -`, clipboard paste. Shows on
  `pointer:coarse` or compact panes; `pointerdown.preventDefault` keeps xterm
  focus + soft keyboard up. Mock/exec terminal unchanged (line-based, no bar).
- **Mobile Done resets URL** (`9bf592f`): `minimizeWindow` left `focused`
  intact so UrlSync never re-fired — URL stuck on `/files` after dismiss.
  UrlSync now derives from the *visible* (focused AND not-minimized) app;
  dismiss → `replaceState("/")`, deep-link onto a minimized app restores it.
  Also covers the Android shell home button.
- **Persisted layout vs deep links** (`29bc59b`, found by e2e): boot
  `hydrate()` rebuilt the store from `os-vps:layout` AFTER UrlSync opened the
  deep-linked window — returning devices got the grid or a stale URL rewrite.
  New `hydrateBoot()` merges (live windows keep id/payload/focus on top,
  persisted single-instance dupes drop, multi apps coexist via id remap);
  profile/layout apply keeps replace semantics. +7 store-persist tests.
- Tests 124 → **136**. Verified: PTY echo/history/^C through the key bar on
  prod, prefs file write + server-hydrate after localStorage wipe, deep-link
  with saved layout (Files focused over restored windows, URL intact), demo
  regression-free.

## 2026-06-09 — Hardening + Phase E responsive sweep + PTY terminal + stock search (DONE)

- **API hardening** (`dec2c5f`): `HostError` + `apiError` across all 35 `/api/v1`
  routes — curated messages pass through as 400 (they're UX), everything else is
  masked to "Operation failed" + logged server-side with the route name, so raw
  Node errors (ENOENT/EACCES with absolute paths) never reach the client.
  Dependency-free input validation (`readJson`/`requireString` kit in
  `lib/host/api-error.ts`, no zod) on exec + fs mutations; `verifySession` now
  requires a numeric `expires_at`. Tests 41→124 (session sign/verify, path
  bounds/symlink escapes, destructive-filter table, pty e2e).
- **A11y/UX** (`3602d0e`): specific aria-labels (window controls, browser nav,
  appearance swatches); settings config errors surface as a toast; loading spinners.
- **200-line rule** (`c123786`): files-manager `app`/`use-files` + browser
  `use-remote-browser` split into focused modules.
- **Phase 3+4 responsive sweep DONE** — browser, media-viewer, image-editor/
  media-studio (compact prop + pane-relative sheet), reel-editor compact tabs,
  app-store chips + `TouchList`, create-app `@xl` two-col, assistant composer
  safe-area + compact save-button fix. Container-first (`useContainer`/
  `@container`) throughout — no new `matchMedia`. Tracker: MOBILE-RESPONSIVE-PLAN.md.
- **system-monitor**: live process table — fixed a real `ps` parse bug
  (multi-word comm names broke the positional split in `lib/host/sys.ts`);
  compact card rows via `TouchList`.
- **Stock search**: `/api/v1/stock/search` — keyless Openverse by default,
  optional `OS_UNSPLASH_ACCESS_KEY` → Unsplash (key stays server-side).
  image-picker "Stock" tab is live with debounce/attribution/error states.
- **PTY terminal**: `node-pty` + `@xterm/xterm`. `lib/host/pty.ts` session
  manager (ring buffer + `Last-Event-ID` resume, 8-session cap, 30-min idle
  reap, `term.open`/`term.close` audited); `/api/v1/term/{open,stream,input,
  resize,close}` SSE bridge. Live mode = a real interactive shell (vim/top/ssh
  work); mock untouched; falls back to one-shot exec if the PTY fails.
- **Skipped on purpose**: response-shape unification. The error shape
  (`{ error: string }`) is already uniform via `apiError`; a full `{ok,data}`
  wrapper would be client churn for no user value.

---

## 2026-06-06 — Multi-shell OS: macOS · Windows 11 · Android · iOS · Dashboard (P1–P6 complete)

Ported the multi-shell system matured in app-rahmanef's appshell fork back into the
framework (two-way merge — close guards/winId/Button-sweep/dock deep-links all kept).
`registry/shells.tsx` + per-surface shell prefs (Settings → Appearance → Shell);
Windows 11 chrome (taskbar/Start/Snap-Assist, caption-button windows), Android
Material-You shell, Dashboard cockpit (os-shell consumer, single-pane over AppHost +
useSystemStats home), iOS NC pull-down + app long-press; chrome-aware snap re-tile
(WindowState.snapZone + applyChromeInsets); wallpaper=auto → per-OS presets. Lifted
to rr as appshell 1.2.0 (resources 2f653ea, all slice gates green). Tracker:
docs/MULTISHELL-PLAN.md. Deployed: build + systemctl restart, site 200.

## 2026-05-31 — Phase 18: Maximize Next.js — addressable OS (routing/Link/Image) (DONE)

Stopped treating the shell as a client-only SPA (one route, all client state) and
leaned into Next App Router — **without touching the windowing model** (user keeps
multi-window OS; URL just mirrors the focused app).

- **Catch-all route** `app/[[...slug]]/page.tsx` replaces the single index page.
  A generic `UrlSync` (appshell core) mirrors the FOCUSED app + its launch path to
  the URL (`/files/home/rahman`, `/code`, `/terminal`). Deep links open that window
  on load; back/forward walks focus history. Two-way + loop-guarded (refs for
  pathname, live focus read from the store). Opt-out via `manifest.routing=false`.
- **History API, not router.push.** Opening a window is pure client state, so
  `UrlSync` rewrites the address bar with `window.history.push/replaceState` (Next 16
  syncs `usePathname`) — instant, no RSC roundtrip, no remount. router.push caused a
  full route transition + UrlSync remount on every open (caught + fixed in verify).
- **App slugs** assigned centrally in the manifest (`AppDescriptor.slug`, falls back
  to `id`) so app slices stay URL-agnostic: files/code/terminal/monitor/…
- **Link-based launch.** Dock + Launchpad render `<Link href>` (real anchors):
  ⌘/middle-click opens an app in a new tab (deep link); plain left-click stays an
  in-place window open (preventDefault → openWindow, URL synced by UrlSync).
- **Per-route metadata** — `generateMetadata` derives `<title>` from the slug
  ("Code — Topside"), verified server-side via curl.
- **next/Image** for browser favicons (fixed Google s2 host in `images.remotePatterns`).
  Host-fs images + the live Playwright screenshot stream stay raw `<img>` on purpose
  — dynamic/auth'd bytes the optimizer can't help with (documented in next.config).
- Shipped A→fix chain (`4987d7d` route+Link+Image · `4a72f36` loop fix · `d482513`
  History API). Verified on demo: deep-link /code + /files/home/rahman, dock→URL,
  back/forward focus history, 12 dock hrefs, server titles. prod :4005 + demo :4006 200.

---

## 2026-05-31 — Phase 17: AppShell framework — manifest-driven, features as slices (DONE)

Restructured the monolithic `os-shell` slice into a generic, rr-liftable shell
framework + pluggable feature slices. **Pure restructure — zero frontend change**
(parity-verified by before/after screenshots at desktop 1280 + phone 390).

- **`appshell` slice (generic, brand-free)** — the shell runtime/chrome moved here
  from os-shell: window store, surfaces (desktop window-mgr + iOS mobile shell),
  app registry, the pub/sub buses (toast/activity/inspector), and the chrome
  skeleton (menu-bar/dock/launcher/wallpaper/windows). Lifts to rr as-is.
- **One responsive source of truth** — `<ResponsiveProvider>` + `useResponsive()`
  replaced the two duplicate `useIsMobile` (inline + `@/hooks/use-mobile`).
  `useContainer()` + safe-area tokens. DRY primitives `AppFrame`/`MasterDetail`/
  `ResponsiveToolbar`/`TouchList` built + exported (adoption deferred — that's a
  frontend change).
- **Manifest-driven** — `<AppShell manifest>` is the single entry point; a project
  supplies `{ brand, apps, features }`. `FeatureRegistryProvider` + `<Slot region>`
  compose the surfaces from config (open/closed: add a feature = manifest edit).
  Brand (name/logo) now flows from the manifest into the menu-bar.
- **Features as slices** — `shell-search` (overlay/Spotlight), `shell-inspector`
  (rightPanel + AI), `shell-notifications` (toast + Dynamic Island), `shell-control-center`,
  `shell-widgets` (Today). Mobile features read surface state via a `ShellUI`
  context instead of props. Buses stay in core so apps don't depend on feature
  slices. `os-shell` is now a thin consumer: `shell.manifest.ts` (Topside brand +
  app list + features) + a re-export barrel, so all app slices stay untouched.
- Shipped per phase (A `7be0491` · B `7be0491` · C `08ed734` · D `cd716ab`),
  typecheck + build green each, prod :4005 + demo :4006 verified 200.

Lift-prep done (Phase F `ee2b7a9`): de-genericised appshell's last consumer
literals (persist key + idle name → manifest), de-Convex'd os-shell metadata,
added trios. Capability injection done (Phase G `b16ac0a`): appshell core no
longer imports `@/lib/{appearance,os-api}` — appearance + CPU readout come via
`manifest.capabilities`; os-vps adapts its store/host in `os-shell/capabilities.ts`.
The framework core is now brand- AND consumer-free (only the universal `cn`
helper remains). Verified behaviour-neutral (theme toggle, CPU chip, wallpaper,
device detection, mobile surface all intact).

Feature-slice capability injection done (`eb671fa`): the `shell-*` slices no longer
import `@/lib/*` either (except the universal `cn`). Their data deps now arrive via
`ShellCapabilities` — `useSearch` (Spotlight → `SearchHit[]`), `useSystemStats`
(Today widgets), `useChat` (scoped AI stream), `useServerToggle` (optional control-
center server tile). os-vps wires the real `@/lib` sources in `os-shell/capabilities.ts`.
The **entire shell** (core + features) is now consumer-free. Verified behaviour-neutral
(Spotlight search + theme command, mobile Today telemetry "CPU 61% 8 cores").

Remaining: adopt the responsive primitives across app UIs (the visible mobile
sweep — deferred, it changes the frontend).

---

## 2026-05-31 — Docs reconcile (DONE)

Docs had drifted: PLAN / ARCHITECTURE / DESIGN-RECONCILE / SLICE-CATALOG still
described Convex + the agent bridge (gone since Phase 15), and this log stopped at
Phase 14. Fixed: ARCHITECTURE + PLAN rewritten to the self-contained reality;
DESIGN-RECONCILE stamped ARCHIVE with a "what actually shipped" diagram;
SLICE-CATALOG re-keyed to the host contract + all 14 slices listed; this log
brought current. `MOBILE-RESPONSIVE-PLAN` flagged as not-yet-built (DRY primitives
`useResponsive`/`AppFrame`/`MasterDetail`/`ResponsiveToolbar`/`TouchList` = 0 files).

---

## 2026-05-30/31 — Phase 16: Files CRUD + DnD upload polish (DONE)

- **DnD upload of files AND folders** (`82ac15d`) — binary-safe. `lib/host/fs.ts`
  `uploadInto` (jailed, atomic tmp+rename, 100 MiB/file); multipart `/api/v1/fs/upload`;
  `webkitGetAsEntry` recursive walk (`read-drop.ts`); split Upload Files/Folder UI.
- **One-action New Folder + Spotlight folder search** (`5d46c6b`) — `cmd.newFolder`
  (mkdir → auto-select → inline rename); `searchFs` (dirs under `~/projects`, jailed,
  skips node_modules/.git/…) + `/api/v1/fs/search`; Spotlight opens apps AND folders.
- **Rename pre-selects the name** (`37c699c`) — typing replaces, Finder-style.
- **Demo FS persists to localStorage** (`2fee6a1`) — mock tree mirrored to
  `os-vps:demo-fs` so a visitor's sandbox survives reload (structure, not bytes).
- **Whole-window drop zone** (`15ace18`) — the entire Files window is a drop target
  (drops on toolbar/padding no longer fall through to the browser), with a "Drop files
  & folders" overlay + Uploading/Uploaded toasts + a flat-file fallback.

---

## 2026-05-30 — Phase 15: Self-contained pivot + security + Topside rebrand (DONE)

The big architecture change: **dropped Convex + the external Control-Room agent.**
os-vps now runs AS a host process and controls its own machine directly.

- **Self-contained host layer** — `lib/host/` (fs/exec/sys/paths) is the single
  facade for `/api/v1`; signed-cookie auth (`lib/auth/`, HMAC `OS_SESSION_SECRET` +
  password + device approval) replaced `@convex-dev/auth`. Layout/registry →
  localStorage; device allowlist + BYOK config → `~/.os-vps/*.json`. No Convex, no agent.
- **Security pass** (`4a293cd`) — append-only JSONL audit (`lib/host/audit.ts`,
  `~/.os-vps/audit.log`); exec destructive-command guard (`rm -rf /`, mkfs, dd,
  fork bomb…) bypass via `OS_EXEC_ALLOW_DESTRUCTIVE`; exec rate-limit; tight default
  FS scope (read+write = home + ~/projects); 24h sessions; README threat model.
- **Rebrand os-vps → Topside** (`56b3707`) — dropped the "OS" overclaim in all
  user-facing strings (it's a cockpit/utility, not an OS). Repo/service/domain slug
  unchanged.
- **os-browser to loopback** — Playwright service rebound 127.0.0.1:4002 (was 0.0.0.0);
  stale ufw 4002 docker-bridge rules cleaned.

---

## 2026-05-30 — Phase 14: Real browser (Playwright) — drivable + screenshots + persistent session (DONE)

The iframe-proxy couldn't beat google's CSP. Replaced it with a REAL headless
Chromium on the host (Playwright, Apache-2.0) — renders any site, drivable from
the CLI, with a persistent session/cache so logins stick + no per-site API needed.

- **Host service** `os-browser` (new repo `/home/rahman/projects/os-browser`,
  systemd, loopback :4002, secret-gated): `chromium.launchPersistentContext`
  (userDataDir `~/.os-vps/chrome-profile` = cookies/cache/session on disk). HTTP
  API: navigate/screenshot/state/content/click/type/key/scroll/back/forward/reload.
  ufw: docker0 + docker_gwbridge on 4002 (non-public).
- **os-vps**: `lib/agent/server.ts` `browserConfigured()`+`browserFetch()`; 11
  `app/api/v1/browser/*` routes (Convex-auth-gated → `172.18.0.1:4002`). Browser
  slice rewritten to a single REMOTE view: live screenshot `<img>`, click mapped to
  the 1280×800 viewport, keyboard/wheel forwarded, settle-poll after actions.
  Deleted tab-strip/new-tab/blocked-overlay (real browser needs none). Dokploy env
  `OS_BROWSER_URL` + `OS_BROWSER_SECRET` set.
- **CLI**: `~/.claude/skills/os/os-browser.sh` (go/shot/content/click/type/key/
  scroll/state/back/…) drives the SAME session — screenshots land in /tmp so they
  can be viewed. `/os-browser-list` rewritten to check the real service.
- Verified on host: google/github/HN/example all render (screenshots viewed),
  content extracted, session persists.

---

## 2026-05-30 — Phase 13: Browser fix + full function audit + /os-list, /os-browser-list (DONE)

- **Browser "tidak berfungsi" diagnosed**: backend was 100% fine (proxy renders with
  a valid token). Real causes were client-side: (a) token async-null → iframe
  flashed a 401, (b) in-page links escaped the frame → frame-blocked.
- **Fixes**: browser waits for `useAuthToken()` ("Establishing session…") + re-keys
  iframe on token (no 401 flash); proxy injects a click/submit interceptor →
  `postMessage({__osb,url})` → app re-proxies + syncs omnibar (in-page nav works).
- **Full live audit** (signed in via device-password, real token): **13/13 /api/v1
  functions 2xx** — sys stats/processes, fs list/read/usage/mkdir/write/move/copy/
  delete, exec, apps, proxy. Browser proxy RENDERS example/wikipedia/HN/httpbin/
  google (base+nav injected, X-Frame-Options stripped).
- **New skills**: `/os-list` (`~/.claude/skills/os-list/`, audit.js probes every
  endpoint + app→function matrix) and `/os-browser-list` (browser-check.js tests
  the proxy across real sites). Both sign in + run live.

---

## 2026-05-30 — Phase 12: Deep VPS browse + dynamic favorites + browser proxy + /os skill (DONE)

- **Tree bug fix (couldn't descend live)**: `DirChildren` built child paths from the
  REQUESTED path ("/") not the host's canonical path → "/projects" → outside roots.
  Now uses the agent-returned `r.path` as the base → full real tree browsable
  (home → projects → any depth).
- **Agent read = whole filesystem** (explorer.ts): `OS_AGENT_FS_READ_ROOTS` (set `/`
  in .env.local) — same access the pty already grants. WRITES stay bounded to
  home + ~/projects (`OS_AGENT_FS_WRITE_ROOTS`). read ops (read/usage) now follow
  read-roots, not write-roots.
- **Dynamic favorites**: FsList now carries `roots` + `parent`; the agent returns
  Home / Projects / Filesystem; mock returns its shortcuts. Files sidebar renders
  favorites from `roots` (no more hardcoded /Media that 404 on the VPS). Portable
  `~` = home in both adapters (mock norm maps "~"→"/"); Files + both trees default
  to `~`, with `/` reachable via the Filesystem root.
- **Browser actually works**: `app/api/v1/proxy` (Convex-token-gated via query)
  fetches the page server-side, strips X-Frame-Options/CSP, injects `<base>` →
  iframe renders. (Limits: omnibar nav only; in-page links/heavy-SPA/auth-walled
  still constrained.)
- **`/os` skill** (`~/.claude/skills/os/`): playbook + `os.sh` to drive the VPS via
  the agent endpoints (ls/cat/write/mkdir/rm/mv/cp/exec/usage) — same bridge the
  web OS uses. Smoke-tested.

---

## 2026-05-30 — Phase 11: Shared live file-tree + AI Inspector (every app) (DONE)

Two cross-cutting features. tsc + build green.

**Shared live file-tree** (`components/shared/file-tree/`, import `@/shared/file-tree`):
- Reusable recursive tree that **lazy-loads each dir via OsApi fs.list** (mock OR
  the real VPS in Live mode → syncs the host), expand/collapse, selection, and
  **inline create-file / create-folder** (hover affordance per folder) + refresh.
- **code-editor**: dropped the static seed tree (deleted components/file-tree.tsx
  + SEED_TREE) → mounts the shared `<FileTree>`; onOpenFile routes through
  `useEditor.open` which fs.read's the live file.
- **files-manager**: added `<FileTree>` to the sidebar (Favorites top · tree
  scrolls middle · Storage bottom). Folder click → navigate main pane; file click
  → new `cmd.openPath` (code-editor / media-viewer handoff).

**AI Inspector** (os-shell, ⌘I / menu View + ✨ status button):
- `os-shell/lib/inspector.ts` — typed module bus (mock-os OSBus pattern made real):
  apps `usePublishInspector(appId, {subject, props, actions, context, suggestions}, deps)`
  to publish their live state + callable actions. Keyed by appId; panel reads the
  FOCUSED app's descriptor.
- `components/inspector.tsx` — right-docked panel, tabs **Properties** (live state
  rows + one-click actions) | **AI** (`inspector-ai.tsx`: scoped Alfa chat — prepends
  the app's context + props so replies are grounded in what you're looking at;
  reuses the real /api/assistant stream, moved to neutral `lib/ai/stream.ts` to
  avoid a slice cycle). Suggestion chips per app.
- **All 14 apps publish descriptors**: browser (URL/title/tabs/bookmarks + reload/
  newtab/bookmark/home), code-editor (file/lang/lines/unsaved + save/new),
  files-manager (path/items/selected/storage + newfolder/refresh/empty-trash),
  media-studio, media-viewer, reel-editor, system-monitor (cpu/mem/disk/procs/mode
  + refresh), os-terminal (cwd/cmds/mode + clear), os-settings, app-store,
  create-app, assistant. Each wired to REAL state/handlers.

---

## 2026-05-30 — Phase 10: Live backend — fs write + exec + real render (DONE)

Closed the 4 "still mock" gaps so the OS actually drives the VPS. tsc + build green.

**Agent (vps-rahmanef, live systemd `vps-control-room-agent`)** — additive, CR not
touched:
- `agent/src/fs/mutate.ts` — read/write/mkdir/delete/move/copy/usage, **same
  allowed-roots bounds as the read explorer** (home + ~/projects), symlink-resolved
  before the check; atomic write (tmp→rename); refuses to modify a root.
- `agent/src/exec/run.ts` — one-shot shell (`/bin/bash`), cwd bounded to roots,
  30s timeout, 1 MiB output cap → `{stdout,stderr,code}`.
- Registered `GET /fs/read|/fs/usage`, `POST /fs/write|/fs/mkdir|/fs/delete|/fs/move|
  /fs/copy|/exec` in `health-server.ts`, all behind `requireGatewayAuth`.
- Built + restarted; smoke-tested via loopback: all ops OK, `/etc/passwd`→400
  (bounds hold), no-auth→401, real `whoami`/disk. Agent still 0.0.0.0:4001,
  CR frontend `active`, container→172.18.0.1:4001/health 200.

**os-vps frontend:**
- OsApi `exec` simplified to one-shot `run(cmd, cwd?) => {stdout,stderr,code}`
  (dropped unused pid/stream/kill) across types + mock + http adapters.
- 9 new `app/api/v1` proxy routes (fs read/write/mkdir/delete/move/copy/usage,
  exec/run, apps) — Convex-auth-gated, same pattern as fs/list.
- `sys/processes` now REAL (parses `ps` via exec) instead of `[]`.
- **os-terminal**: Live mode wires mkdir/rm/mv/cp/touch to OsApi fs; unknown
  command → host shell passthrough (`exec.run`). Mock UX unchanged.
- **files-manager** mutations (already wired) now hit the real VPS in Live.
- **reel-editor**: fake progress bar → **real client-side render** (Canvas 2D →
  `MediaRecorder` → downloadable `.webm`), real progress + cancel. No ffmpeg/deps.
- **runtime-app**: non-html installed apps → live exec console (Run → `exec.run`
  → stdout/stderr/exit), replacing the static manifest card.

Parity now ~100% depth / 100% coverage. Live mutations + exec + render all real;
behind device-approval auth + gateway secret + non-public agent (ufw DROP).
Remaining non-goals: interactive pty (vim/top) — one-shot exec only; audio in
reel render (canvas stream is video-only).

---

## 2026-05-29 — Phase 9: Finish all apps (full parity sweep) (DONE)

Lifted every below-par app to ~full mock-os parity (7 parallel subagents, each
its own slice, rr-clean ≤200 lines/file, mock-backed). tsc + build green.

- **reel-editor** (55→~90): comp presets + fps, clip drag/resize/split/dup/move,
  per-clip keyframes + lane graphs, clip props + text entrance anims, live
  preview canvas, undo/redo, NL "AI edit", mock render overlay, shortcuts.
- **media-studio** (65→~90): clip masks, safe-area guides, HTML-embed + image
  layers, per-layer custom CSS, JSON/HTML import, real undo+redo (50-deep,
  debounced), color palette, JSON/HTML export modal.
- **assistant** (35→~85): tabbed Chat/Agents/Skills/Automations + agent/skill/
  automation editors + grouped tool picker (localStorage). Chat still the REAL
  Claude stream; active agent persona prepended to the sent messages.
- **media-viewer** (70→~90): audio waveform player, video transport, image
  zoom + dims + checkerboard, type chip, download, open-in-editor handoff.
- **files-manager** (75→~90): drag-drop move, Trash (~/.Trash + Empty Trash),
  real file-picker upload, selected-item details strip.
- **os-settings** (75→~90): About pane (version + live sys/storage + Reset),
  Server test-connection chip, reduce-transparency (already had shell-style).
- **mobile shell** (60→~85): status bar (clock + signal/wifi/battery), home
  grid + dock + page dots, app-switcher (swipe-up cards, tap-focus, swipe-to-
  close), home-indicator drag gestures.

Already ≥80% and left as-is: browser, app-store, create-app, system-monitor,
os-terminal. Parity now ~88% depth, 100% app coverage.

---

## 2026-05-29 — Phase 8: Dynamic app registry + modular polish (DONE)

Made the app layer **dynamic** (apps added at runtime appear live) while keeping
slices **modular** (each self-contained behind its barrel; one declarative list).

Core (shell + Convex):
- **Window payload**: `openWindow(app, title, size?, payload?)` + `WindowState.payload`;
  every app component now receives a `payload?: unknown` prop (`AppProps` exported
  from os-shell). Re-open with new payload updates + focuses.
- **Convex `features/apps`**: per-owner runtime app registry — `create`,
  `setInstalled`, `remove`, `listInstalled`, `listAll`. 
- **Dynamic registry**: `app-store/lib/use-installed-apps` turns installed rows
  into `AppDescriptor`s (icon via a glyph→Lucide map; `RuntimeApp` host renders
  html entries in a sandboxed iframe, else a manifest card). `app/os-root.tsx`
  now merges `BUILTIN_APPS` + `useInstalledApps()` inside the auth boundary —
  no more hardcoded-only list.

Wired (subagents, parallel, disjoint slices):
- **create-app** → real Create App form (name→slug, runtime autofill, glyph +
  gradient picker, live manifest preview) → `apps.create` → app appears in dock.
- **app-store** → 6-app catalog merged with live install state; Get/Uninstall →
  `apps.setInstalled`; installed apps surface in dock/launchpad.
- **open-file-by-payload** → files-manager routes a file to code-editor (`{path}`,
  read via fs.read) or media-viewer (`{path,name,kind}`, remote→"open in editor"
  handoff) through `openWindow` payload.
- **shell** → full menu bar (File/Edit/View + existing os-rr/app/Log Out) + a
  toast system (`lib/toast` store + `ToastHost`, barrel-exported for any slice);
  Spotlight fires toasts on run.
- tsc green, build green. Parity now: app coverage 100%, depth ~80%, registry
  modular + dynamic.

---

## 2026-05-29 — Phase 7: App parity sweep + live host bridge ON (DONE)

Raised feature parity across the 6 thinnest apps (parallel re-author from
`mock-os/`, rr-clean, ≤200 lines/file) AND turned the real-VPS file bridge on.

**Parity upgrades** (each its own slice, mock-backed, shadcn/tokens):
- files-manager → grid/list, breadcrumb + back/fwd, favorites sidebar, multi-
  select, context menu, cut/copy/paste, rename, new-folder, storage bar, sort,
  open-by-ext. Added `fs.move`/`fs.copy` to the OsApi contract (types + mock +
  http). Live mutations fail gracefully ("read-only on live host").
- code-editor → multi-tab, file-tree explorer, Cmd+S save, status bar, new file.
- browser → back/fwd/reload/home + bounds, per-tab history, security icon,
  loading bar, bookmarks + bar, new-tab quick-links, blocked-site overlay, menu.
- os-terminal → 17-command shell (ls/cd/cat/mkdir/rm/mv/cp/df/ps/neofetch/…),
  cwd, history arrows, colored prompt; ls/cat hit OsApi fs live.
- media-studio → tools (V/T/R/O/S), layers (vis/opacity/reorder/rename), 5
  aspect presets, 8 filter chips, per-layer transform, zoom, Export JSON, undo.
- system-monitor → 4 circular gauges (CPU/Mem/Disk/GPU-mock), CPU + net
  sparklines (rolling), process table (host placeholder when empty).
- tsc green, build green.

**Live host bridge ENABLED** (real VPS directory listing):
- Agent (vps-rahmanef, systemd `vps-control-room-agent`) was loopback-only
  (127.0.0.1:4001) → unreachable from the Dokploy swarm container. Rebound to
  `AGENT_HEALTH_HOST=0.0.0.0` (keeps loopback for the CR frontend, which calls
  127.0.0.1:4001 — CR NOT broken) + restarted. ufw INPUT policy is DROP, so
  4001 stays blocked from the public iface.
- The os-vps swarm task egresses via `docker_gwbridge` (172.18.0.x); added
  `ufw allow in on docker_gwbridge to any port 4001`. Verified from inside the
  live container: `http://172.18.0.1:4001/health` → 200.
- Set Dokploy os-vps env `OS_AGENT_URL=http://172.18.0.1:4001` + `OS_AGENT_SECRET`
  (existing env preserved). Flip Settings → Server → **Live** to list the real
  VPS tree. Agent fs is **read-only** (only `/fs/list`) — listing is real,
  mutations stay mock/local.

Security: agent reachable from host containers + tailnet, NOT public (ufw DROP +
only docker0/docker_gwbridge allowed on 4001); every call still gated by the
os-vps Convex-auth route + the agent's `x-control-room-secret`.

---

## 2026-05-29 — Phase 6B: BYOK AI assistant (DONE, deployed)

Alfa now talks to a real Claude model. BYOK: the Anthropic key lives in Convex
(owner config) or falls back to the server `ANTHROPIC_API_KEY` env.

- `features/appConfig` — owner singleton {anthropicApiKey, model}. `getConfig`
  (masked: hasKey + last-4 + model), `getApiKey` (raw, server-route only),
  `setConfig` (requireUser). Key is write-only from the UI.
- `app/api/assistant/route.ts` — Node-runtime SSE stream. Auth-gated by the
  caller's Convex Bearer (`authedConvex` in `lib/agent/server.ts`, added next to
  `verifyAuth`). Resolves key = Convex BYOK || `ANTHROPIC_API_KEY`; 501 if none.
  `@anthropic-ai/sdk` `messages.stream`, model default `claude-opus-4-8`
  (configurable), `system` block with `cache_control: ephemeral`, thinking off
  for snappy chat + final-answer-only system instruction. Emits `delta`/`done`/
  `error` SSE events; last-20-turns context window; max_tokens 4096.
- `assistant/lib/stream.ts` — client SSE reader → async generator of text
  deltas, sends history + `useAuthToken()` Bearer. Replaced the mock engine
  (deleted `lib/engine.ts`); `app.tsx` streams real tokens, maps error codes to
  friendly notes.
- Settings → **AI (Alfa)** panel (`os-settings/components/ai-section.tsx`):
  password key field (shows masked), model field, Save. Reactive via Convex.
- tsc green, build green (`/api/assistant` route present), convex deployed.

Note: no key is committed. Until the owner pastes a key in Settings (or
`ANTHROPIC_API_KEY` is set on the Dokploy frontend env), the assistant returns
a "no key" note. Caching: system prompt is < the 4096-token min, so it won't
actually cache yet — the breakpoint is in place for when the prompt grows.

---

## 2026-05-29 — Phase 6A: Device-approval auth (DONE, deployed)

Replaced email/password with the Control Room device-approval model, mapped
onto Convex + `@convex-dev/auth`. Auth portal guard hardened:

- **Factor 1**: shared password in backend env `OS_LOGIN_PASSWORD` (set to the
  owner password). Checked constant-time in `convex/auth.ts`; fail-closed if
  unset/short → nobody gets in.
- **Factor 2**: the device must be `approved` in the new `devices` table. A
  correct password on a new device registers it `pending` and throws
  `device_pending` — **no token is issued until approved**. So any authenticated
  session ⇒ approved device (the gate is at token issuance, not just UI).
- `convex/auth.ts` → `ConvexCredentials({ id: "device-password", authorize })`;
  single shared owner account (`createAccount`/`retrieveAccount`, no per-account
  secret — the device IS the credential).
- `features/devices`: `touch` (internal, called post-password from authorize),
  `approve`/`revoke` (mutation, requireUser = approved device), `listDevices`
  (query), `bootstrapApprove` (internal, CLI-only for the first device).
- Login UI: password-only + a "pending" panel showing the device id (copyable)
  + "Check again". Settings → **Devices** panel (reactive list, approve/revoke,
  "This device" badge). New `auth/lib/device.ts` (128-bit hex id in localStorage).
- Bootstrap path (first device, no approver yet):
  `npx convex run features/devices/mutations:bootstrapApprove '{"deviceId":"<id>"}'`.
- tsc green, build green, convex deployed to api-os.

Caveat: revoke takes effect on next token refresh (≤ refresh-token TTL); the
gate is at sign-in. Old email/password users/accounts are now orphaned (unused).

---

## 2026-05-29 — Phase 5: Spotlight ⌘K command palette (DONE)

Cleared the top autonomous backlog item. macOS-style Spotlight over the whole
desktop — open any app + run shell actions from one box.

- `os-shell/components/spotlight.tsx` — ⌘K/Ctrl+K palette: subsequence search
  (typing "cdr" → "Code Editor"), Arrow/Enter/Esc nav, mouse hover sync, glass
  sheet. Sources: all 12 apps (open) + actions (Launchpad, Minimize all, Close
  all, Toggle theme). ≤200 lines, shadcn/token styling, no fuzzy lib.
- Store: `spotlightOpen` state + `setSpotlightOpen`/`toggleSpotlight` +
  bulk `minimizeAll`/`closeAll` ops; `useSpotlightOpen` hook.
- Global ⌘K hotkey in `desktop.tsx` (works desktop + mobile); Search button in
  the menu-bar status cluster.
- tsc green, `next build` green.

Remaining backlog is BLOCKED on user decisions:
- Real AI assistant — needs `ANTHROPIC_API_KEY` (none in env/`.env.local`).
- Live VPS data — needs prod agent-bridge reachability (infra call:
  rebind+firewall vs Traefik expose). Mock keeps prod up until decided.
- Phase 3b live exec/pty terminal — depends on the same prod reachability.

---

## 2026-05-29 — Phase 4: Full app suite (DONE)

Maximized the os-rr app set — every prototype app now exists as a best-practice
rr slice (re-authored from `mock-os/`, not copied). 8 new app slices built by
parallel agents, each shadcn + theme tokens + ≤200 lines/file + metadata trio,
self-contained mock data (data layer wires later via OsApi):

- `code-editor` — gutter + overlay textarea + regex syntax highlight; fs.read/write.
- `media-studio` — tool rail + canvas (live CSS filters) + adjust/layers panel.
- `reel-editor` — multi-track timeline, playhead, transport, clip props, mock render.
- `browser` — omnibar + tabs + sandboxed iframe.
- `media-viewer` — image (zoom)/video/pdf preview, offline data-URI samples (noDock).
- `app-store` — catalog grid, search, category filter, install toggle.
- `create-app` — manifest form (name/runtime/accent/desc) + live icon preview.
- `assistant` — "Alfa" chat UI, streaming local mock engine (TODO: real /api route).

Registry now mounts 12 apps (`app/os-root.tsx`). Added shadcn primitives:
textarea, slider, badge, tabs. tsc green, `next build` green.

Backlog: real AI (Anthropic via /api/assistant), live data for these apps once
the prod agent bridge is decided, Spotlight ⌘K command palette.

---

## 2026-05-29 — Phase 3: Live host bridge (CODE DONE, locally verified)

Wired OsApi `live` mode to the real Control Room host agent — securely.

Design: browser → **same-origin `/api/v1` route handlers** (Convex-auth-gated)
→ host agent with `x-control-room-secret`. The agent stays loopback-private; its
gateway secret is server-only env (`OS_AGENT_SECRET`), never in the browser.

- [x] Studied the agent auth guard (`vps-rahmanef/agent/src/terminal/auth.ts`):
      JSON API gated by `x-control-room-secret` (timing-safe), pty WS by HMAC
      `session` cookie, binds 127.0.0.1:4001, fail-closed (<32-char secret).
- [x] `convex/me.ts` `getMe` — server-side session verification probe.
- [x] `lib/agent/server.ts` — `agentFetch` (adds secret) + `verifyAuth`.
- [x] Route handlers: `/api/v1/sys/stats` (→ agent `/health` telemetry),
      `/api/v1/fs/list` (→ agent `/fs/list`), `/api/v1/sys/processes` (→ `[]`).
- [x] OsApi live mode → same-origin base + Convex Bearer token (`useAuthToken`).
- [x] **Local e2e verified** vs the running agent: no-token→401; with token→real
      cpu/mem/disk telemetry + real `/home/rahman` listing.
- [ ] **PROD reachability** — Dokploy container can't reach the loopback agent;
      needs an infra decision (rebind+firewall, or Traefik expose). NOT done
      unilaterally — prod live mode returns 501 until decided; mock keeps prod up.
- Deferred Phase 3b: live `exec`/pty terminal (agent `/terminals` + `/ws/terminals`).

---

## 2026-05-29 — Phase 2: Auth & Convex persistence (DONE)

Made the deployed Convex backend real — OS gated behind `@convex-dev/auth`,
window layout persisted per-user to `features/windows`. (Re-sequenced after the
Phase 3 deploy; auth is the prerequisite for any Convex-backed UI.)

- [x] Self-hosted auth keys set on backend: JWT_PRIVATE_KEY + JWKS (RS256, via
      `sc-convex/set-auth-env.js` REST — avoids the CLI `--` PEM bug) +
      SUPER_ADMIN_EMAIL. CONVEX_SITE_ORIGIN/CLOUD_ORIGIN already container-level.
- [x] PBKDF2 password hashing in `convex/auth.ts` (Scrypt times out behind the
      Dokploy proxy → "connection lost").
- [x] `auth:*` actions routed via `ConvexHttpClient` (WS reconnect mid-flight
      aborts in-flight actions) — `app/ConvexClientProvider.tsx`. Switched from
      the nextjs server provider to `@convex-dev/auth/react` ConvexAuthProvider.
- [x] `convex/_generated` committed (un-gitignored) — frontend imports typed
      api; Docker build has it (no codegen in image).
- [x] `auth` slice: Password sign-in/up `LoginScreen` + `AuthGate`
      (Authenticated/Unauthenticated/AuthLoading). Log Out in the menu bar.
- [x] `os-shell` layout persistence → Convex `windows.getLayout`/`saveLayout`
      (localStorage instant cache, Convex authoritative, debounced).
- [x] tsc green (now incl. convex), `next build` green, shipped.

Note: backend env keys (JWT_PRIVATE_KEY/JWKS) are stored on the Convex
deployment only — NOT in the repo. Rotating = re-issue all sessions.

---

## 2026-05-29 — Phase 3: Ship (DONE)

Live: https://os.rahmanef.com + Convex self-hosted https://api-os.rahmanef.com
(+ site-os / dash-os), all HTTP 200. Repo `git@github.com:rahmanef63/os-vps.git`.

- Canonical `si-coder deploy.js`: GitHub repo + push, Dokploy project/app
  `os-vps` + compose `os-vps-db` (Convex template), admin-key gen, schema push
  (auth + windows + systemMonitor indexes), Hostinger DNS (os/api-os/site-os/
  dash-os), frontend build → `done`.
- pnpm Dockerfile (`ARG NEXT_PUBLIC_CONVEX_URL` build-arg inlining).
- Disabled `cacheComponents` (dynamic app; was blocking prerender on auth cookie).
- `next lint` removed in Next 16 → placeholder; typecheck is the CI gate.
- sc-git pre-push hook installed → `convex/` pushes auto-deploy.
- Admin key in gitignored `.env.local`.

---

## 2026-05-29 — Phase 1: Design reconcile (DONE)

Adopted the `mock-os` (os-rr) macOS-style design, re-authored into rr slices.

- globals.css → os-rr glass tokens (light/dark, accent, 5 wallpapers, traffic
  lights). `lib/appearance` (theme/accent/dir/wallpaper/server cfg).
- `lib/os-api` — the VPS boundary: MockAdapter ↔ HttpAdapter (os-rr Cloud API
  contract). Convex = auth/persistence; OsApi = host hot path.
- os-shell rebuilt: menu bar (live sys stat), glass dock, traffic-light windows
  + edge-snap/maximize, launcher, wallpaper, mobile shell.
- Apps: system-monitor + os-terminal rewired to OsApi; new files-manager +
  os-settings. Default light/aqua/aurora.

---

## 2026-05-29 — Phase 0: Foundation (DONE)

rr-conventional scaffold (Next 16 + React 19 + Tailwind 4 + Convex self-hosted
+ @convex-dev/auth). os-shell window manager, system-monitor, os-terminal;
Convex features windows + systemMonitor. Docs + mock/ placeholder. tsc green.
