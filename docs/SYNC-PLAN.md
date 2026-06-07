# SYNC-PLAN — app-shell ⇄ os-vps parity

> Goal: both projects end up equally good — app-shell's framework depth lands in
> os-vps, os-vps's hygiene/security lands in app-shell, and the UI/UX converges
> on the best of both. Tracker created 2026-06-07 after a cross-repo audit +
> validation of an external browser-agent review.

## Ground rules

1. **NO Convex in os-vps.** Ever. os-vps stays host-local (localStorage +
   `~/.os-vps/*` files). All ported framework features are already
   localStorage/in-memory based — verified: zero `convex` imports in
   `features/appshell` (one doc comment only). Phase 3 has an explicit grep
   gate.
2. **Browser app is QUARANTINED.** The os-vps `browser` slice + `os-browser`
   service must not be modified or restarted as part of this plan — a bad
   change can take the box down. All browser-related audit items are parked in
   the Quarantine section for a separate, supervised session.
3. **Framework bugs get fixed ONCE in app-shell** (the canonical appshell
   copy), flow to os-vps via the rr lift + port (Phases 2–3). No double-patching
   unless a fix is urgent on the os-vps side.
4. **rr gates at write time**: ≤200 LOC per file (UI chrome surfaces get
   leeway, split where os-vps already showed the shape), shadcn `Button`,
   `cn()` for classnames, brand-free framework code.
5. **Ship per phase** (typecheck + build + e2e green → commit → push).
   app-shell pushes auto-deploy via Dokploy; os-vps deploy = build +
   `systemctl restart` on this box (manual, announce before restart).

## Audit validation (external browser-agent review, validated 2026-06-07)

| # | Reported issue | Verdict | Root cause | Phase |
|---|---|---|---|---|
| 1 | `document.title` stuck on "Settings — Topside" | CONFIRMED — no title sync anywhere | framework gap (`use-url-sync.tsx` never touches title) | P1 |
| 2 | Deep links (/settings, /files) don't open apps | NOT REPRODUCIBLE IN CODE — `app/[[...slug]]/page.tsx` + `use-url-sync.tsx:93-107` explicitly `openWindow()` on pathname | needs runtime repro; possibly conflated with browser-service outage | P0 (repro task) |
| 3a | Uptime shows 7889d | CONFIRMED BUG — `lib/host/sys.ts:43` returns `os.uptime() * 1000` (seconds→ms, UI divides by 86400) | os-vps host lib | P0 |
| 3b | About 34 GB vs Monitor 31 GB RAM | CONFIRMED — About uses decimal GB (`/1e9`), Monitor uses binary GiB (`1024**3`); same API, different formatters | os-vps consumer | P0 |
| 3c | neofetch says 16 GB / uptime 14d | BY DESIGN (hardcoded mock in `os-terminal/lib/fs-model.ts:60-70`) — but confusing in live mode | os-vps consumer | P0 |
| 4 | Terminal `ls` fake vs Files real | PARTIAL — live mode tries real `fs.list` first, silently falls back to mock on error | os-vps consumer | P0 |
| 5 | Mission Control previews empty | BY DESIGN (no live DOM thumbnails, stated in `window-overview.tsx:64-70`) | backlog, not a bug | Backlog |
| 6 | Window cascade runs off-screen | CONFIRMED — `appshell/lib/store.ts` cascade `(order.length % 6) * 28`, no `workArea()` clamp; same bug in BOTH repos | framework | P1 |
| 7 | Files exposes `.ssh`/`.gnupg`/`vault` | BY DESIGN (denylist covers only `~/.os-vps` + `.env*`; session = owner) — defense-in-depth still worth it | os-vps host lib | P0 |
| 8a | Full device ID shown | CONFIRMED (`auth/components/devices-panel.tsx:92`) | os-vps consumer | P0 |
| 8b | Server access token in localStorage | CONFIRMED (`lib/appearance/store.tsx:46` persists all tweaks incl. `server.token` plain) | os-vps consumer | P0 |
| 8c | Anthropic key handling | OK — server masks (`api/config/route.ts:19`), GET never returns full key | none | — |
| 9a | Alfa executes without confirmation | PARTIAL — chat UI is text-stream only today; automation runner needs review | os-vps consumer | P0 |
| 9b | `systemctl`/`shutdown`/`reboot` not in destructive guard | CONFIRMED (`lib/host/exec.ts:19-27`) | os-vps host lib | P0 |
| 10 | Browser stuck "Loading remote browser…" / chrome-error | NOT REPRODUCIBLE statically — frontend clean; likely env (`OS_BROWSER_URL`/secret) or service state | QUARANTINED | Quarantine |

Positive notes from the audit (no action): Settings, Files, System Monitor,
Video Editor, Image Editor, App Store, Create App, Preview, Alfa, Launchpad
solid; zero console errors.

---

## Phase 0 — os-vps quick fixes (validated bugs, no framework churn)

All in os-vps, each small and independent. One commit per logical fix.

- [x] **Uptime bug**: `lib/host/sys.ts:43` — return `os.uptime()` (seconds), RESOLVED differently: ms IS the contract (mock emits ms too) — annotated `SysStats.uptime` as ms and fixed About to use the shared `fmtUptime(ms)`.
- [x] **Unify byte formatting**: shared `formatBytes` (binary GiB) used by About (`os-settings/components/about-section.tsx`) and System Monitor (`system-monitor/lib/format.ts`). One machine → one set of numbers.
- [x] **neofetch live data**: in live mode, populate neofetch from `api.sys.stats()` (cores/mem/disk/uptime); keep mock only for demo mode. Label demo output `(demo)`.
- [x] **Terminal `ls` honesty**: in live mode, do NOT silently fall back to the mock FS on API error — print the error. Mock fallback stays demo-only (`os-terminal/commands.ts:51-65`).
- [x] **Destructive guard expansion**: `lib/host/exec.ts:19-27` — add patterns for `systemctl (stop|restart|disable|mask)`, `shutdown`, `reboot`, `poweroff`, `init 0|6`, `kill -9 1`. Blocked = same `code 126` + audit `exec.blocked` path. (Owner can still SSH for real ops; cockpit gets the guard.)
- [x] **Assistant exec review**: confirm chat path stays text-only; if/when tool-use exec lands, require an explicit in-UI confirm before any `exec/run` tool call. VERIFIED 2026-06-07: chat = text-only streamReply; automation Run only toasts (no exec); /api/v1/exec/run audits every call (success, blocked, error). Confirm-UI rule stands for when tool-use exec lands.
- [x] **Device ID masking**: `auth/components/devices-panel.tsx:92` — show `…last6` + copy-full button instead of full ID.
- [x] **Token out of plain localStorage**: stop persisting `server.token` inside `os-vps:tweaks` (`lib/appearance/store.tsx:46`). Move to `sessionStorage` (or keep in memory + re-enter), exclude from the tweaks JSON.
- [x] **FS defense-in-depth**: extend `isCredentialPath()` (`lib/host/paths.ts:57-66`) with a default-deny list for `~/.ssh`, `~/.gnupg`, `~/.secrets`, `~/vault`, `~/.bash_history`, `~/.npmrc` (read+list). Override via env (`OS_FS_ALLOW_SENSITIVE=1`) for the rare day it's needed. Document `OS_FS_READ_ROOTS` narrowing in INSTALL.md.
- [x] **Deep-link runtime repro**: with the dev server, hit `/settings` `/files` `/monitor` cold (no localStorage) and verify `use-url-sync` opens the window. DONE 2026-06-07: /settings, /files, /monitor all auto-open their app (demo dev server :3217, headless Chromium). CLOSED — not reproducible; likely audited during a browser-service glitch.

Verify: `pnpm typecheck && pnpm build` green; manual click-through of About/Monitor/Terminal numbers matching.

## Phase 1 — framework fixes in app-shell (canonical copy)

Fix once here; Phases 2–3 carry them to os-vps. Each gets an e2e check in
`os/scripts/e2e/`.

- [ ] **Cascade clamp**: `features/appshell/lib/store.ts` `openWindow` — clamp spawn rect to `workArea()` (x, y, and keep `x+w`/`y+h` inside; respect chrome insets). Cascade wraps instead of marching off-screen.
- [ ] **Focus-if-open default**: apps without `multi: true` already reuse; make reuse-or-focus the documented default and add a palette-visible behavior test (open Files twice → one window, focused).
- [ ] **`document.title` sync**: new `lib/window-title.ts` — subscribes to shellStore focus, sets `document.title = "{focused app title} — {brand}"` (brand from manifest; falls back to app title only). Desktop + mobile surfaces. Consumer opt-out flag.
- [ ] **e2e**: `f21-title.sh` (open Settings → title contains "Settings"), `f22-clamp.sh` (open 8 windows → all rects within viewport via palette-reported state or bounded marker).
- [ ] Ship: typecheck + build + full e2e suite green → commit → push (Dokploy).

## Phase 2 — rr lift `appshell@1.3.0` (app-shell → rr)

- [ ] **LOC splits in app-shell, mirroring the os-vps shape** (os-vps is the reference — it already passes the gate):
  - `lib/store.ts` 236 → `store.ts` + `store-state.ts` + extracted helpers (os-vps: 199/67/70/54 across store/state/geometry/snap)
  - `components/menu-bar.tsx` 260 → `menu-bar.tsx` + `menu-bar-menus.tsx` + `menu-bar-status.tsx` (os-vps: 73/197/87)
  - audit remaining >200 files (`dock.tsx` 287, `mobile-home.tsx` 247) — split or document chrome-surface exemption explicitly in CONTRACTS.
- [ ] **Lift the F1–F20 union + Phase-1 fixes** to rr as `appshell@1.3.0`: brand-free check, parity stamps, CHANGELOG, include the 11 vitest suites.
- [ ] Regens + version bump per rr process.

## Phase 3 — port `appshell@1.3.0` → os-vps (same-ancestor merge)

Merge rules per the 1.2.0 port: same-ancestor diff, KEEP os-vps local fixes
(split files, lint-clean hooks, Ventura icons), take app-shell's new modules
wholesale (they're additive libs + feature slices).

- [ ] Merge framework: new `lib/*` (commands, badges, layouts, recents, window-commands, spaces, window-tabs, quick-look, clipboard, share, dnd, focus-mode, shortcuts, profiles, lock) + new bundled features (quick-look, clipboard, share, shortcut-help, lock-screen) + `desktopWidgets` slot + types/store/geometry deltas + Phase-1 fixes.
- [ ] **NO-CONVEX GATE**: `grep -ri convex frontend/slices/appshell --include='*.ts*' -l` must return nothing (comments exempted). No new deps beyond what app-shell's slice uses (zero).
- [ ] Wire consumer (`os-shell`): command registry into os-vps Spotlight; desktop widgets bound to the REAL `api.sys.stats()` (os-vps advantage — live CPU/mem/disk on the wallpaper); lock-screen unlock guard → existing session auth; share/quick-look/dnd registrations for files-manager + media-viewer (preview real files); a11y commands over os-vps appearance store.
- [ ] **Test infra port**: add vitest config (os-vps has none — verified 0 test files); the 11 suites ride in with the merged libs and must pass.
- [ ] **e2e harness port**: `scripts/e2e.sh` + `e2e-lib.sh` + checks adapted to os-vps (own port, guard against the live :3000 service; never assert against the browser slice; auth — run with a dev session or demo mode). Reuses the already-running os-browser service read-only.
- [ ] Deploy: build + announce + `systemctl restart` (NOT the `vps-control-room-*` services).

## Phase 4 — UI/UX parity (best of both)

- [ ] **Appearance contract in framework**: one shared shape — brand hex engine + font scale + high contrast + reduced motion (from app-shell) ⊕ accent / RTL dir / wallpaper presets Aurora-Bloom-Material-iOS (from os-vps). Consumers extend, neither forks.
- [ ] os-vps adopts: a11y palette commands, focus-mode toggle in control center, brand-hex picker.
- [ ] app-shell adopts: wallpaper preset gallery (alongside its Unsplash picker), glass-theme tokens where they read better.
- [ ] **Visual QA pass**: side-by-side screenshots per shell (macOS/Windows/iOS/Android/Dashboard) on both apps via os-browser (read-only `shot`); align dock, menu-bar, control-center, settings layout discrepancies; file follow-up diffs.
- [ ] Mission-Control thumbnails (audit #5): optional upgrade — content-aware preview (app-supplied preview node or html2canvas-free snapshot). Backlog unless cheap.

## Phase 5 — app-shell hardening (os-vps → app-shell)

- [ ] **Gate Convex functions**: `convex/files.ts` + `convex/dashboards.ts` are fully public today — anyone with the deployment URL can write/delete. Decide auth story (@convex-dev/auth is already a dep): minimum = a shared-secret arg checked server-side; better = real identity. **Decision needed from rahman before implementing.**
- [ ] Keep Convex strictly in app-shell (rule 1).

## Quarantine — browser (DO NOT TOUCH this plan cycle)

- Browser app stuck at `chrome-error://chromewebdata/` / "Loading remote browser…" (audit #10) — static analysis found no code bug; likely `OS_BROWSER_URL`/`OS_BROWSER_SECRET` env or service state. Diagnose in a dedicated supervised session: check env, `curl` the loopback `/state`, inspect service — **no restarts without explicit go-ahead**.
- Any change to `frontend/slices/browser/` or `os-browser/`.
- Deep-link item stays in P0 only as a repro task; if the repro points at the browser service, it moves here.

## Definition of done

- Phase 0: all validated os-vps bugs fixed, numbers consistent across About/Monitor/Terminal, guard + masking shipped.
- Phase 1–3: os-vps runs appshell 1.3.0 with all 20 features + framework fixes, zero Convex, vitest + e2e green on BOTH repos.
- Phase 4: appearance contract shared; per-shell screenshots reviewed.
- Phase 5: no unauthenticated writes to app-shell's Convex.
