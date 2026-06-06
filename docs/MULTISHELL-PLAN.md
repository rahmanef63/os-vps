# Multi-shell plan — macOS · Windows · Android · iOS · Dashboard

> Port the multi-shell system matured in `app-shell/os/features/appshell` (the
> superset sibling of this repo's `frontend/slices/appshell` — same ancestor,
> 95% identical tree) into os-vps, then lift the union to rr as the canonical
> appshell. Apps need ZERO edits: every shell renders the same `useApps()` +
> window store + `WindowContent`.

Source of the port: `~/projects/app-shell/os/features/appshell` (commits up to
`fd367ec`, 2026-06-06 — shells registry, chrome insets + re-tile, per-OS
wallpapers, Window/Help menus, iOS NC + long-press, Snap-Assist).

## Progress

- [x] **P1 — Port multi-shell core into `frontend/slices/appshell`** (2026-06-06)
  - [x] Delta files copied: `registry/shells.tsx`, `components/shells/windows/*` (4),
        `components/shells/android/android-shell.tsx`, `components/shells/{context-menu,window-overview}.tsx`,
        `components/{notification-center,app-switcher,mobile-notifications}.tsx`
  - [x] Shared files merged (two-way drift, per-hunk): `lib/types.ts`, `lib/store.ts`,
        `lib/store-state.ts`, `lib/store-geometry.ts`, `lib/toast.ts` (notification log),
        `hooks/use-shell.ts`, `components/{desktop,window,menu-bar,menu-bar-status,mobile-shell,mobile-home}.tsx`,
        `registry/{capabilities,types}.tsx`, `index.ts` barrel. KEPT os-vps-local:
        close guards + `winId`, shadcn `<Button>` sweep, dock `<Link>` deep-link/prefetch,
        `appshellConfig` naming. Took app-shell's dock (magnification superset) + window
        (`variant`) + desktop (resolveShell) wholesale.
  - [x] appshell stays brand-free + capabilities-driven (rr-lift contract intact)
  - [x] wp-win11/material/ios/auto presets in `app/globals.css`
  - [x] Gate: typecheck+build green; shells register; default prefs = macOS/iOS
        (manual 5-shell click-through still recommended on a logged-in device)
- [x] **P2 — Dashboard shell** (`os-shell/dashboard-shell.tsx`, 2026-06-06)
  - [x] Single-pane sidebar (apps from registry) + `<AppHost>` content,
        `windowed: false`; home = host CPU/mem/disk cards (useSystemStats) + app grid
- [x] **P3 — Settings merge** (2026-06-06)
  - [x] `shell-settings` `AppearanceAdapter` gains optional `shellDesktop`/`shellMobile`
  - [x] `os-settings` Appearance → "Shell" section (per-surface switcher, live)
  - [x] Wallpaper `auto` (default; stored picks unchanged) + Bloom/Material/iOS presets
  - [x] Fix: auth gate maps auto→aurora (renders before a shell resolves)
- [x] **P4 — Mobile fidelity** (came with P1; wiring verified)
  - [x] iOS: left-half pull-down NC, right-half CC; app long-press sheet
  - [x] Android: shade + drawer + recents + gesture nav, self-contained
- [x] **P5 — `/rr lift appshell` → resources 1.2.0** (commit 2f653ea, pushed)
  - [x] Pre-flight: android-shell split (android-parts); dock/menu-bar/mobile-home/store
        split too (≤200-LOC gate); raw `<button>` → shadcn Button sweep; template
        classNames wrapped in cn() (audit-templates hard gates)
  - [x] slice.json + contract + catalog `1.1.0 → 1.2.0` (parity), changelog entry
        (`appshell@1.2.0`), gen-manifest/agent-md/registries, `slices:check` green.
        KEPT rr-owned: bundled features block + mockCapabilities in the barrel,
        config.ts registry identity. (`contracts:drift` fails on a PRE-EXISTING
        event-tracking orphan — also fails on clean HEAD, untouched.)
- [x] **P6 — Verify + ship** (2026-06-06)
  - [x] typecheck + build green; pushed `81ca31e..fe8238d` (6 commits + fix)
  - [x] Deployed: `systemctl restart os-vps` → active, https://os.rahmanef.com 200,
        login screen renders (screenshot-verified via os-browser)

## Decisions

- 5 shells (no neutral "mobile" tab-bar shell — app-shell-only).
- Dashboard shell lives in `os-shell` (consumer), NOT appshell — the framework
  stays data-free; same split app-shell uses.
- Shell features stay separate slices here (`shell-search` etc.); ported shells
  reference `<Slot region>` only, never import a feature slice. Region names
  already match (`today/notifications/controlCenter/topPill`).
- Merge direction on shared files: take app-shell's multi-shell hunks, KEEP
  os-vps-local fixes (two-way drift — never whole-file overwrite).

## Risks

1. Two-way drift in the 9 shared files → per-hunk merge, verify with typecheck +
   the "shell unset = identical" gate.
2. `notification-center.tsx` may overlap `shell-notifications` slice → NC is
   window-store-driven macOS chrome (clock toggle), the slice is the toast host;
   both can coexist (same as app-shell).
3. rr LOC gate only trips on `android-shell.tsx` → split before lift, not before P1.
