# Mobile / responsive plan — DRY, dynamic, every feature

> **STATUS: Phases 1–4 DONE (2026-06-09).** The shell switch (`useIsMobile`,
> desktop window-mgr vs `MobileShell`) is done ✅; the DRY primitives —
> `useResponsive`, `AppFrame`, `MasterDetail`, `ResponsiveToolbar`, `TouchList` —
> SHIP in `appshell/primitives/` + `responsive/` and re-export via
> `@/features/os-shell`. Phase 2 (high-traffic apps, 2026-06-03) ✅: `files-manager`
> / `system-monitor` / `os-settings` wrap their pane in `AppFrame` (pane
> `@container` + safe-area, Radix `ScrollArea` kept inside for styled desktop
> scrollbars); `os-terminal` + `code-editor` status bar honor the home-bar via
> `--sai-bottom`; `files-manager` + `code-editor` collapse their sidebar via
> `AppSidebar` (the shell's MasterDetail wrapper). Phase 3 (creative apps,
> 2026-06-09) ✅: browser, media-viewer, image-editor/media-studio (compact prop
> + pane-relative sheet), reel-editor compact tabs. Phase 4 sweep (2026-06-09) ✅:
> app-store chips + `TouchList`, create-app `@xl` two-col, assistant composer
> safe-area — including the `TouchList` retrofit into existing custom lists
> (process table, app-store rail). Container-first throughout, no new `matchMedia`.
> **Remaining:** only Phase 5 — the verify pass (Playwright at 360/768/1280) +
> pixel polish. `ResponsiveToolbar` is intentionally NOT forced onto the rich
> toolbars (breadcrumbs/selects don't fit its flat item model).

Goal: every app works in **both** shells — the desktop window-manager AND the
full-screen mobile shell — without per-app bespoke media queries. One source of
truth for "how big am I", shared primitives, container-driven layout.

## Why it's not responsive today

- The **shell switch** is now ratio+touch aware (`useIsMobile`, `desktop.tsx`):
  desktop window-manager vs `MobileShell`. ✅ done.
- But **app content** mostly assumes a wide desktop window. In the mobile shell
  (or a narrow window) apps don't reflow: fixed multi-column grids, side-by-side
  panes (code-editor tree + editor), wide toolbars, fixed-px widths. Mock data
  renders the same regardless of size.
- Root cause: apps key layout off the **global viewport** (or nothing), not off
  **their own pane width**, and each would need its own breakpoints → not DRY.

## Principles

1. **Container-first, not viewport-first.** An app is sized by its window/pane,
   not the screen. Use Tailwind **`@container`** + `@sm/@md/@lg` variants so the
   SAME component reflows correctly in a 380px window and a fullscreen phone.
   (Tailwind 4 container queries are already in use in a few slices — make it the
   default.)
2. **One responsive source of truth.** A single `useResponsive()` hook derives
   `{ isMobile, isCompact, pane, safeArea }` from the shell decision + the app's
   container — no `window.matchMedia` scattered in components.
3. **DRY primitives over per-app CSS.** Shared layout components so apps compose
   instead of re-implementing: `ResponsiveToolbar`, `MasterDetail`, `PaneTabs`,
   `TouchList`. Fix once, every app benefits.
4. **Touch targets + safe areas.** ≥44px hit targets on coarse pointers; honor
   `env(safe-area-inset-*)` (notch/home-bar) via a shared wrapper.
5. **No data assumptions.** Layout must not depend on mock vs live data shape.

## Architecture

```
useIsMobile (device ratio/touch)         ← shell choice (done)
   ├── DesktopChrome → windows (resizable)        each window is an @container
   └── MobileShell   → one fullscreen pane         the pane is an @container
            │
            └── SAME app component (registry) renders in either,
                reflowing via @container + useResponsive()  ← the DRY layer
```

- Build the DRY layer in `os-shell` and export from its barrel:
  - `useResponsive()` — `isMobile` (from shell context), plus a `ref` + observed
    container width → `isCompact`/`pane:"xs"|"sm"|"md"|"lg"`.
  - `<AppFrame>` — standard app scaffold: header/toolbar slot + scroll body +
    safe-area padding; collapses toolbars to an overflow menu when compact.
  - `<MasterDetail>` — side-by-side on wide, stacked/back-nav on compact (for
    files sidebar+grid, code-editor tree+editor, settings nav+pane).
  - `<TouchList>` / `<ResponsiveToolbar>` — list rows + toolbars that grow hit
    targets + wrap on coarse/compact.
- Add container-query + safe-area tokens to `globals.css` once.

## Per-slice checklist (all apps)

| App | Make responsive (compact / mobile) |
|---|---|
| **os-shell** | ✅ windows already; MobileShell pane is an `@container`; dock/menu-bar collapse; Spotlight full-width on mobile |
| **files-manager** | ✅ `MasterDetail`: sidebar → drawer/back on compact; grid cols `@container` (2→3→4→6); toolbar → overflow menu; thumbnails ✓ |
| **code-editor** | ✅ tree as `MasterDetail` (hidden→toggle on compact); tabs scroll; editor full-width; status bar wraps |
| **os-terminal** | ✅ full-bleed; larger font + input on touch; toolbar minimal |
| **media-viewer** | ✅ fluid (object-contain); controls reachable; toolbar wraps |
| **media-studio** | ✅ compact prop + pane-relative sheet (image-editor); canvas fits container |
| **reel-editor** | ✅ timeline horizontal-scroll; panels → compact tabs |
| **system-monitor** | ✅ gauges grid `@container` (4→2→1); process table → `TouchList` card rows on compact |
| **app-store / create-app** | ✅ grid `@container` + chips/`TouchList` rail; create-app `@xl` two-col (single column on compact) |
| **assistant** | ✅ chat fills; composer pinned bottom + safe-area; compact save button fixed |
| **os-settings** | ✅ nav → top tabs/drawer on compact; rows stack |
| **browser** | ✅ omnibar compact; controls overflow; remote view fits container |

## DRY rules (enforced)

- No `window.innerWidth` / ad-hoc `matchMedia` in app components — use
  `useResponsive()` or `@container` variants only.
- No fixed pixel widths for layout regions — use fr/%, `min-w-0`, container units.
- Toolbars: declare actions as data → `ResponsiveToolbar` decides inline vs
  overflow. Don't hand-roll per app.
- New apps inherit responsiveness by composing `AppFrame` + primitives.

## Phasing

1. **Primitives** ✅ — `useResponsive`, `AppFrame`, `MasterDetail`,
   `ResponsiveToolbar`, `TouchList`, tokens. (os-shell barrel.)
2. **High-traffic apps** ✅ (2026-06-03) — files, code-editor, terminal, settings,
   system-monitor.
3. **Creative apps** ✅ (2026-06-09) — media-studio, reel-editor, media-viewer, browser.
4. **Sweep** ✅ (2026-06-09) — app-store, create-app, assistant; `TouchList` retrofit.
5. **Verify** — drive the real Playwright browser at phone/tablet/desktop sizes
   (and `/os-browser.sh shot`) per app; rotate to confirm reflow. ← remaining

## Demo media (separate, shipped alongside)

`public/demo-media/` holds uploadable sample media so the **demo** (mock, no host)
can actually open images/video/audio. `scripts/gen-demo-media.mjs` scans the dir
→ `manifest.json`; the mock adapter lists a **"Demo Media"** root from it; `rawUrl`
serves `/demo-media/*` as static bytes (no `/api`, no auth). Drop files in the
dir, regenerate the manifest, redeploy the demo.
