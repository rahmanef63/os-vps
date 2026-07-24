# os-vps (product name: **MSO**)

Mobile-first web cockpit for a headless VPS, from any browser. Desktop-style UI
metaphor over a vertical-slice stack; value is utility (terminal/files/monitor/
browser), not an OS. Repo/service/domain keep the `os-vps` slug; "MSO" is the
UI brand. **Self-contained**: a single Next.js app, no database, no external
agent — it runs AS a host process and controls its own machine.

- Stack: Next 16 (App Router) · React 19 · Tailwind 4 · shadcn/ui · TypeScript.
  **No `middleware.ts` — `proxy.ts`** (Next 16 rename).
- Auth: password + device approval → HMAC signed-cookie session (`lib/auth/`).
  No Convex, no Clerk.
- Host access: `lib/host/` does fs/exec/sys directly (Node `fs` + `child_process`),
  bounded by `OS_FS_READ_ROOTS` / `OS_FS_WRITE_ROOTS`.
- Layout: `app/` + `frontend/slices/<slug>/`; barrel-only cross-slice imports
  (`@/features/<slug>`).

## Read first
- `README.md` — what it is, features, security model, quickstart.
- `.env.example` — every env var.
- `docs/` — `ARCHITECTURE.md` + `PLAN.md` are current (self-contained). `PROGRESS.md`
  is the running log (newest on top; Phase 17 = AppShell framework, Phase 18 = routing);
  `DESIGN-RECONCILE.md` is stamped archive (old Convex/agent design);
  `MOBILE-RESPONSIVE-PLAN.md` = the deferred "Phase E" sweep (primitives ARE built in
  `appshell/primitives/`, but NOT yet adopted across app UIs — that changes the frontend).

## Architecture
```
browser ──https──> os-vps (Next.js :4005) ──── lib/host → Node fs/child_process (host)
              signed-cookie auth (lib/auth)
```
The former os-browser sidecar (Playwright Chromium, :4002) is RETIRED — the
Browser app renders pages in a client-side sandboxed iframe now; `os-browser/`
stays in-repo only as dev tooling (scripts/e2e use its Playwright install).
- `/api/v1/*` = the os-rr Cloud API (fs/exec/sys/browser), every route `verifyAuth`
  (session cookie) first. Client picks mock (default) vs live in Settings → Server.
- `/api/auth/*` = login/logout/me/devices. `/api/config` = BYOK AI key.
- Persistence is local: window layout + app registry in localStorage; device
  allowlist + config in `~/.os-vps/*.json`.

## AppShell framework (the shell is generic + rr-liftable)
The shell is NOT one slice. It is split so the whole desktop+mobile shell can lift
to `resources/` (rr) and drive any project from one manifest:
- `frontend/slices/appshell/` — the **generic, brand-free** framework: window runtime
  + desktop/mobile surfaces, app/feature/brand registries, `<Slot region>`,
  `ResponsiveProvider`/`useResponsive` + the 4 DRY primitives, the pub/sub buses
  (toast/activity/inspector), and `<AppShell manifest>` (the one entry point). It
  imports NO brand/feature and NO os-vps `@/lib/*` — only the universal `@/lib/utils`
  (`cn`). Everything project-specific arrives via `manifest.capabilities`.
- `appshell/features/{search,inspector,notifications,control-center,widgets,quick-look,
  clipboard,share,shortcut-help,lock-screen}` — each shell **feature** lives NESTED inside
  the appshell slice (converged to the rr-canonical shape; they were flat top-level
  `shell-*` slices before). Each mounts into a named `<Slot>` via `defineFeature({ id,
  slots, provider? })` and is consumer-free (data via capabilities, not `@/lib`).
  `appshell/defaults.ts` bundles all 10 as `DEFAULT_FEATURES` (one-line install:
  `features: DEFAULT_FEATURES`); the barrel re-exports it LAST so the `defineFeature`
  ES-cycle resolves. Buses live in core so apps fire them without depending on a feature
  slice. (`shell-settings` stays a flat UI-primitives slice — not a feature unit.)
- `os-shell` — the thin os-vps **consumer**: `shell.manifest.ts` (MSO brand + app
  list + slugs + features) + `capabilities.ts` (adapts `@/lib/appearance`+`os-api`+
  `ai/stream` to `ShellCapabilities`) + a re-export barrel (`@/features/os-shell`
  re-exports appshell verbatim, so all app slices stay unedited).
- **Windowing** (`appshell/lib/store.ts`): `openWindow(app,title,size,payload,{multi})`.
  Default = single instance per app (reuse/focus); `AppDescriptor.multi` (e.g. Files)
  spawns a fresh window each open. `focusApp(id)` reveals the front-most existing
  window without spawning — used by `UrlSync` so deep-links/back-forward don't
  duplicate a multi app. **Window coords (`win.x/y`) are relative to the desktop
  `<section top-[30px]>`, NOT the viewport** — snap/maximize geometry must use
  `workArea()` (section-relative: `top=GAP`, `bottom=vh-TOPBAR-DOCK_RESERVE`), the
  drag snap preview must be `position:absolute` (shares the surface), and drag
  commits must use `offsetLeft/offsetTop`, never viewport `getBoundingClientRect`.
- **`window-content.tsx` loads app bundles with `useState`/`useEffect`, NOT
  `React.lazy`+`Suspense`.** Window opens come from the synchronous external store
  (`useSyncExternalStore`); a Suspense boundary suspending in that path misses its
  retry ping — the chunk resolves but the spinner only clears on the next render
  (a click). A `setState` on import-resolve always re-renders. Don't reintroduce
  Suspense here. Dock hover warms the chunk (`app.load()`), so it stays instant.
- **Dock = macOS behaviour**: clicking a running app focuses its front window
  (`focusApp`, never spawns); hovering shows its open windows to switch + a "New
  Window" entry for `multi` apps. Opening surfaces (Launchpad/Spotlight) spawn.
- **`ShellCapabilities`** is the injection seam: `useAppearance`, `useCpuPercent`,
  `useSearch`→`SearchHit[]`, `useSystemStats`, `useChat`, `useServerToggle`. Defaults
  merged in `CapabilitiesProvider` so optional caps degrade (accessors stay
  unconditional). Add an app = manifest edit; add a shell feature = new
  `appshell/features/<feat>/` + `defineFeature` + add to `DEFAULT_FEATURES`. No surface
  edits (open/closed).

## Routing — the OS is addressable (keep windowing!)
- ONE catch-all route `app/[[...slug]]/page.tsx` (no per-app pages). Windowing is
  untouched; only the **focused** app + its launch path is mirrored to the URL
  (`/files/home/rahman`, `/code`). `appshell` `UrlSync` does it.
- **URL writes use the History API, NOT `router.push`.** Opening a window is pure
  client state — `router.push` triggers a full RSC transition + remount (slow, flashy
  + breaks the sync). Use `window.history.push/replaceState`; Next 16 syncs
  `usePathname`. Deep links / ⌘-middle-click `<Link>` / back-forward still navigate.
- App URL slugs are assigned centrally in `shell.manifest.ts` (`AppDescriptor.slug`,
  falls back to `id`); app slices stay URL-agnostic. Dock + Launchpad use `<Link href>`
  with **`prefetch={false}`** — MANDATORY: left-click is intercepted (never navigates),
  so default prefetch would fire one RSC render of the dynamic catch-all per link
  (24 on load) and peg the VPS. The href is only for middle/⌘-click. Never drop it.
- The catch-all **must `notFound()` reserved paths** (`slug[0]==="_next"`): otherwise a
  missing `/_next/static/*` chunk falls through and returns the app HTML with 200 →
  wrong-MIME refusal, no recovery. 404 lets the client router hard-reload onto the new build.
- `next/Image` ONLY where the optimizer helps (browser favicons via the fixed Google s2
  host in `next.config` `images.remotePatterns`). Host-fs images + the live Playwright
  screenshot stream stay raw `<img>` on purpose (dynamic/auth'd bytes).

## Deploy / ops (prod :4005 + demo :4006 are systemd, not Dokploy)
- `os-vps.service` (:4005, WorkingDir `/home/rahman/projects/os-vps`) serves
  os.rahmanef.com via `next start`. Demo `os-vps-demo.service` (:4006, WorkingDir
  `/home/rahman/projects/os-vps-demo`, `NEXT_PUBLIC_OS_DEMO=1` → no auth, mock data).
- **Deploy prod:** `pnpm build` **THEN** `sudo systemctl restart os-vps.service`. ALWAYS
  build-then-restart, never the reverse, and never rebuild again after restarting
  without restarting once more — `next start` loads the build manifest at boot, so if
  the on-disk `.next/static` chunks don't match the running process's HTML refs, every
  CSS/JS chunk 404s → unstyled/broken UI. On any chunk mismatch: `rm -rf .next && pnpm
  build && restart` (clean rebuild). Verify with
  `curl -sI :4005/_next/static/chunks/<the-css-the-HTML-refs> | grep content-type` → must be `text/css`.
- **Service worker** is served from `app/api/sw/route.ts` with a **`beforeFiles`
  rewrite `/sw.js`→`/api/sw`** (in `next.config`): a literal `app/sw.js/route.ts`
  gets shadowed by the optional catch-all, and routes under `/api` are never caught.
  The SW bakes `BUILD_ID` into its cache name so its bytes change every deploy →
  the browser detects a new SW → the "Versi baru" reload toast fires (a static
  `public/sw.js` is byte-identical across deploys, so the toast never fired). It
  caches ONLY icons+manifest, never chunks/HTML.
- **New routes need a clean build.** Adding a new `app/**/route.ts` or page folder
  may not register under incremental Turbopack — `rm -rf .next && pnpm build`.
- **`git add` aborts on a bad pathspec** and stages NOTHING new — after a
  `git rm`, don't re-list the removed file in `git add`; prefer `git add -A` and
  check `git status --short` before committing (a broken commit shipped once this way).
- **Deploy demo:** from `/home/rahman/projects/os-vps-demo`: `git fetch origin -q &&
  git reset --hard origin/main -q && pnpm build && sudo systemctl restart
  os-vps-demo.service`. Mind the cwd — running the sync from the prod dir is a classic slip.
- Verify shell behaviour on the demo (no auth): desktop via os-browser at 1280, mobile
  via Playwright (`os-browser/node_modules/playwright`, CommonJS) at 390. Drive Spotlight
  with Meta+k; click the dock by the BOTTOM-most `a[href="/<slug>"]` (the centre ones are
  the hidden Launchpad). `X-Content-Type-Options: nosniff` is set on all routes, so wrong
  MIME is fatal — keep static Content-Types correct.

## Rules in force
- Max 200 lines/file, single responsibility, shadcn primitives only, theme tokens
  not hex, mobile-first. Barrel-only cross-slice imports.
- `/api/v1` host ops go through `lib/host` (bounds + realpath checks) — never call
  `fs`/`child_process` straight from a route.
- Solo-dev: push direct to `main` once `pnpm typecheck` + `pnpm build` are green.
  Conventional commits + Claude co-author.

## Local dev
```bash
pnpm install
cp .env.example .env.local   # set OS_LOGIN_PASSWORD + OS_SESSION_SECRET
pnpm typecheck
pnpm dev                     # OS desktop at :3000 (mock data by default)
node scripts/approve-device.js <deviceId> "my device"   # approve a login device
```
