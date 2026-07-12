# Shell → os-vps Integration Plan

> **Goal:** pull the good parts of the sibling repo **shell.rahmanef.com**
> (portfolio/CMS desktop OS) into **os-vps (Topside)** — widgets, context-menu
> polish, desktop UX — *without* diluting os-vps's essence as a **VPS control
> surface** and *without* touching the file-explorer.
>
> Both repos are diverged forks of the same `rr` slice registry (appshell,
> glass-desktop, command-menu, image-picker, file-explorer, theming). This plan
> is the extraction contract in that direction: **shell → os-vps only.**
>
> Baseline: 2026-07-12. No prior integration plan existed (`SHELL-FIDELITY-PLAN.md`
> is a different goal — OS-native *look*, not sibling-feature *port*). Findings
> below come from a full head-to-head feature audit of both repos on this date.

---

## 0. Hard constraints (read first)

These are non-negotiable. Every task below is checked against them.

1. **Keep os-vps's essence.** Topside is a *web cockpit for a headless VPS* —
   value is **utility** (terminal / files / monitor / browser), not "an OS".
   Self-contained single Next.js app, **no Convex, no database, no external
   agent**, HMAC signed-cookie device-approval auth, host access via `lib/host`.
   Any port that needs a cloud DB or a user-role system is **out of scope** (§4).
2. **Do NOT disturb the file-explorer.** `frontend/slices/files-manager` runs on
   the real VPS host backend + zip/upload flows; it has diverged from shell's
   Convex/mock file-explorer by *purpose*. No port touches its data/hooks layer.
   (Per repo memory: the two file slices must not be merged.)
3. **No new runtime dependencies** unless a port genuinely can't be done with the
   existing stack (shadcn + Tailwind 4 + the appshell buses). The widget engine
   is pure CSS/DOM + a store — no framer-motion, no grid lib.
4. **One window store.** Shells stay chrome-only; never fork `appshell/lib/store.ts`.
5. **os-vps rules stay in force:** ≤200 lines/file, single responsibility,
   shadcn primitives only, theme tokens not hex, mobile-first, barrel-only
   cross-slice imports (`@/features/<slug>`).

---

## 1. Comparison table — every feature area, both repos

Legend — **Better**: which repo's implementation is stronger today.
**Action**: what os-vps should do (✅ already ahead / ↔ parity / ⬇ port from shell / ⛔ out of scope).

| # | Feature area | shell.rahmanef.com | os-vps (Topside) | Better | Action for os-vps |
|---|---|---|---|---|---|
| 1 | **Window mgmt** (open/close/snap/drag/tiling) | thirds-tiling presets, tab groups, Spaces, pinned PiP, chrome-inset re-tile, animated exits | halves+maximize snap, drag-edge preview, tabs, Spaces, close-guards, **section-relative coords + host-aware** | ↔ tie | ✅ Keep. Optional: port **thirds-tiling presets** (`l13/l23/r13/r23`) — pure geometry, low risk |
| 2 | **Desktop & shells** | 6 shells (macOS/Win/iOS/Android/Dashboard/mobile-Dashboard) | 5 shells (macOS/Win/iOS/Android/Dashboard) + **URL-synced windows** | ↔ tie | ✅ Keep. os-vps's routing is a genuine advantage |
| 3 | **Dock / taskbar / launcher / switcher** | macOS dock magnify, Fluent taskbar, Launchpad, ⌘Tab | same, per-shell idiomatic, chunk-warming | ↔ tie | ✅ Keep |
| 4 | **Widgets** | **full editable framework** — 12-col grid canvas, gallery picker, per-space persistence, 13 S/M/L widget types | **3 hardcoded read-only system cards** pinned to wallpaper, on/off only | 🟢 **shell** | ⬇ **P0 flagship port** (§2.1) |
| 5 | **Context menu / right-click** | portal-stacked, arrow-key nav, focus-restore, Fluent variant | **registry-based** (`registerContextMenu`, per-shell dynamic providers) — *more extensible* | ↔ split | ⬇ **P1 polish port** — merge shell's UX niceties onto os-vps's superior registry (§2.2). *Premise correction: os-vps is not missing this.* |
| 6 | **Command palette / spotlight** | cmdk, i18n, **MRU recent-commands history** | bespoke, apps+actions+registry commands + **live VPS fs search** | ↔ tie | ⬇ Port **MRU history** only (§2.5). Keep os-vps's fs search |
| 7 | **App registry & catalog** | 3 registries, lazy bundles, Store metadata | manifest + runtime install/create-app | ↔ tie | ✅ Keep |
| 8 | **App list** | 17 portfolio apps; **no terminal/browser/editor/monitor** | 13 utility apps: **Terminal (pty), Browser (Playwright), Code, Monitor, image+reel editors** | 🟢 **os-vps** | ✅ This *is* the essence — never regress |
| 9 | **File explorer** ⚠️ | sidebar dir-tree, preview pane, properties dialog, mock/convex/live adapters | **real VPS host fs**, zip, upload-progress, inspector | ↔ tie | ⛔ **Do NOT disturb** (constraint #2). Sidebar-tree only, deferred & behind a flag (§3-Deferred) |
| 10 | **Theming / appearance** | 36 presets, 1-hex rebrand, toolbar quick-picker | **same engine** (shell literally "ported from os-vps"), live wallpapers | ↔ tie | ⬇ Optional: **theme-quick-picker** toolbar switcher (§2.6) |
| 11 | **Notifications** | toast→history, per-app badges, calendar in center | toasts + center + **Dynamic Island live-activity bus** | ↔ tie | ✅ Keep |
| 12 | **Settings** | single appearance panel + auto-lock | **multi-section** (AI/Server/Browser/Devices/Theme…) | 🟢 **os-vps** | ⬇ Port only **auto-lock timeout** + deep-link scroll (§2.7) |
| 13 | **Backend / data** | Convex Cloud + IndexedDB + mock fs | **self-contained host control plane** (fs/exec/pty/browser) + jail + audit | 🟢 **os-vps** | ⛔ Convex is out of scope — contradicts essence |
| 14 | **Auth / RBAC** | session-token RBAC, PBKDF2, 6-role matrix, invites | **device-approval** HMAC cookie, single-owner | 🟢 os-vps (for its model) | ⛔ Multi-user RBAC out of scope — os-vps is a personal cockpit |
| 15 | **Resume / portfolio / CMS** | **full headless CMS** driving public site (portfolio/blog/services) | **none** | 🟢 shell (for its purpose) | ⛔ Out of scope — os-vps is not a portfolio |
| 16 | **Media / editors** | image-picker only (no editor) | **image-editor ~6.5k LOC + reel-editor ~6.4k LOC + viewer** | 🟢 **os-vps** | ✅ Keep — major os-vps asset |
| 17 | **Keyboard shortcuts** | ⌘-bindings + Shortcuts reference app | **focus-scoped** hotkeys + cheat-sheet registry | ↔ tie | ✅ Keep (focus-scoping is better) |
| 18 | **Mobile responsiveness** | iOS+Android+mobile-Dashboard chromes | same + DRY primitives (MasterDetail/AppFrame…) | ↔ tie | ✅ Keep (finish Phase-E adoption per `MOBILE-RESPONSIVE-PLAN.md`) |
| 19 | **Assistant / AI** | **real agent loop** — `os` tools issue live tool-calls to drive the OS | streaming chat + AI Inspector, but **agentic layer is declarative-only** (executes nothing) | 🟢 **shell** | ⬇ **P2** — wire real tool execution (§2.3), reusing os-vps's existing tool catalog + Inspector |
| 20 | **Desktop UX** (hot corners / marquee / icons) | hot-corners, marquee rubber-band select, desktop icons, unified arrange grid | **none** (bare desktop, right-click menu only) | 🟢 **shell** | ⬇ **P1** hot-corners + marquee (low risk); icons deferred (§2.4) |

**Summary:** os-vps is *ahead* where it matters to its identity (real host apps,
editors, routing, self-contained backend). shell is ahead on **desktop polish**
(widgets, hot-corners, marquee, agent execution) and carries a whole **portfolio/CMS**
world that is deliberately irrelevant to a VPS cockpit. The port list is therefore
short and surgical, not a merge.

---

## 2. Integration backlog (what to actually port)

Prioritized. Each item: source path in shell, effort, risk to essence, whether it
touches the file-explorer.

| P | Item | Effort | Risk to essence | Touches file-explorer? |
|---|---|---|---|---|
| **P0** | Editable widget framework (glass-desktop) | High | **Low** (reinforces VPS identity) | No |
| **P1** | Context-menu UX polish | Low | None | No |
| **P1** | Hot corners | Low | None | No |
| **P1** | Marquee (rubber-band) selection | Low–Med | None (app-shortcut layer only) | No |
| **P2** | Real agent tool-execution loop | Med | None | No |
| **P2** | Force-quit dialog (⌥⌘⎋) | Low | Low | No |
| **P2** | OS sounds + HUD bezel | Low | None | No |
| **P3** | Command-palette MRU history | Low | None | No |
| **P3** | Theme quick-picker (toolbar) | Low | None | No |
| **P3** | Settings: auto-lock timeout | Low | None | No |
| **P3** | Window thirds-tiling presets | Low | None | No |
| **P4** | Windows-shell chrome extras (action-center / run-dialog / task-view / tray) | Med | Low–Med (Windows persona only) | No |
| **Defer** | File-explorer sidebar-tree / preview / properties | High | **High** | **Yes → deferred** |

### 2.1 — P0: Editable widget framework `[flagship]`
**Source:** `shell.rahmanef.com/features/glass-desktop` (69 files, ~5.3k LOC) —
`lib/widget-registry.ts` (13 widgets), `layout-store.ts` (per-space persistence),
`components/engine/widget-canvas.tsx` (12-col drag/resize grid),
`components/config/widget-picker-grid.tsx` (gallery), `components/widgets/**`.

**Why it wins & fits:** os-vps's `appshell/features/widgets` is 225 LOC of 3
non-editable cards. shell has a real registry with drag/resize/persistence and
**VPS-native widget types** (System Monitor, Theme picker, Shell picker) — the
registry comment literally says it's "curated for the VPS OS, drive the OS from
the wallpaper". Porting it *strengthens* the cockpit identity.

**Plan:**
1. Vendor `glass-desktop` as a new slice `frontend/slices/glass-desktop/`
   (barrel `@/features/glass-desktop`). It's the most self-contained shell slice
   (vendors its own `ui/` + `cn`) — the model to follow per shell's CONTRACTS.md.
2. Wire the shell-agnostic seams os-vps must supply: **grid pitch, drag,
   right-click** come from the host — reuse os-vps's existing marquee/context-menu
   registry (P1) so widgets and (later) desktop icons share ONE selection + drag +
   snap coordinator, exactly as shell does with `desktop-arrange.ts`.
3. Feed the **System Monitor widget** from os-vps's real `useSystemStats`
   capability (it already wants live host telemetry — free win over shell's mock).
4. Persist layout in `localStorage` (`os-vps:widgets:*`), per-space, matching the
   window-layout persistence model. No host/DB dependency.
5. Mount into the existing `desktopWidgets` + `today` slots via `defineFeature`;
   keep the current 3-card `DesktopWidgets` as fallback until the grid is green.
6. **Prune** shell-only widget types that don't fit a VPS (e.g. Email inbox,
   Prayer times) or gate them; keep System/Clock/Calendar/Tasks/Timer/Notes/
   Markdown/HTML/Embed/Theme/Shell-picker.

**Verify:** on demo `:4006` desktop (os-browser @1280) — add/remove/resize a
widget, reload, layout persists; System widget shows live CPU in Live mode.

### 2.2 — P1: Context-menu UX polish
**Source:** `shell.rahmanef.com/features/appshell/components/shells/context-menu.tsx`
**Correction to the task premise:** os-vps is **not** missing right-click — its
`appshell/lib/context-menu.ts` registry is *more* advanced. Only these UX bits are
missing, all additive to the existing render (no data-model change):
- `createPortal(…, document.body)` so the menu always out-stacks dock/menu-bar.
- ArrowUp/Down keyboard nav + auto-focus first item.
- Focus restoration to the trigger on close.
- Optional `data-shell="windows"` Fluent variant (icon gutter, 34px rows).
**Risk:** none. file-explorer keeps its own `file-context-menu.tsx`, untouched.

### 2.3 — P2: Real agent tool-execution loop
**Source:** `shell.rahmanef.com/shared/agentic/**` (`agent-loop.ts`, `registry.ts`,
`define.ts`) + `lib/os-tools.ts`. os-vps's Alfa assistant streams chat but its
tools "execute nothing / automations just narrate" (`assistant/lib/tools.ts`).
Port shell's agent-loop and bind it to os-vps's **already-cataloged** tool groups
(files/apps/media/system/editor/terminal/browser/settings) + the AI Inspector
context. This makes Alfa actually drive the host — a big cockpit upgrade.
**Risk:** none to essence, but respect the host jail: agent fs/exec tools must go
through `lib/host` (bounds + audit), never raw. BYOK stays via `/api/config`.

### 2.4 — P1/deferred: Hot corners + marquee (icons deferred)
**Source:** `appshell/components/{hot-corners.tsx, marquee-selection.tsx,
use-icon-positions.ts, desktop-arrange.ts}`.
- **Hot corners** (P1, no risk): pointer-position listener firing existing shell
  actions (Mission Control / show-desktop / Launchpad). Drop-in.
- **Marquee selection** (P1, low risk): ship the rubber-band + arrange grid over
  an **app-shortcut layer only** — shares the coordinator built for widgets (§2.1).
- **Desktop file icons** (DEFER, medium risk): would imply a desktop *file*
  surface leaning on the file-explorer host adapter → treat as separate task,
  constraint #2. Marquee without file-icons is safe.

### 2.5 — P3: Command-palette MRU history
**Source:** `command-menu/lib/cmdkHistory.ts`. Add a small `localStorage` MRU list
rendered in os-vps's existing Spotlight **when the query is empty**. Keep the live
fs search. ~30 LOC, no risk.

### 2.6 — P3: Theme quick-picker toolbar
**Source:** `appshell/components/theme-quick-picker.tsx`. A compact menu-bar preset
switcher so users re-theme without opening full Settings. Same appearance engine —
purely additive.

### 2.7 — P3: Settings — auto-lock + deep-link scroll
Port only shell's `autoLockMinutes` control (feeds a lock-screen idle timer — os-vps
already has `lock-screen`) and the "scroll to section" deep-link pattern. Everything
else in os-vps Settings is already broader.

### 2.8 — P2 grab-bag: force-quit, OS sounds, HUD bezel
Small self-contained ports: `force-quit-dialog.tsx` (⌥⌘⎋ window-kill list, uses
existing close APIs), `lib/os-sounds.ts` + `hud-bezel.tsx` (volume/brightness HUD —
os-vps already has control-center sliders to drive it). **Skip the battery widget**
(meaningless on a headless VPS) — or repurpose it to a **VPS uptime/load chip**.

---

## 3. Phasing

| Phase | Scope | Exit criteria |
|---|---|---|
| **A — Foundations** | §2.2 context-menu polish · §2.4 hot-corners · §2.5 MRU · §2.6 quick-picker · §2.7 auto-lock | all low-risk, additive; no behaviour regressions; typecheck+build green |
| **B — Selection coordinator** | §2.4 marquee + arrange grid over app-shortcut layer (the shared drag/selection/snap coordinator) | rubber-band select + group-drag of shortcuts works; persists |
| **C — Widget framework** `[flagship]` | §2.1 vendor glass-desktop, wire grid/drag/persistence onto the Phase-B coordinator, System widget on real telemetry | add/remove/resize/reorder widgets; per-space; survives reload; live CPU |
| **D — Agent execution** | §2.3 real tool-loop bound to os-vps tool catalog + Inspector, through `lib/host` jail | Alfa launches an app / changes theme / reads a file via real tool calls |
| **E — Persona depth (optional)** | §2.8 force-quit/sounds/HUD · §1-thirds-tiling · P4 Windows chrome extras | opt-in polish; Windows persona parity if desired |
| **Deferred** | file-explorer sidebar-tree behind a flag, reading os-vps's host adapter, zero changes to current hooks | only if explicitly requested; constraint #2 stays |

**Budget rules:** no new deps (hard); verify each phase on demo `:4006` (desktop
via os-browser @1280, mobile via Playwright @390, per CLAUDE.md); build-then-restart
systemd on deploy; ≤200 lines/file.

---

## 4. Explicitly OUT OF SCOPE (would break essence)

Porting these would turn Topside back into a portfolio site and violate constraint #1:

- **Convex / any cloud DB** (#13) — os-vps is self-contained by design.
- **CMS / résumé / projects / portfolio admin** (#15) — os-vps is a VPS cockpit.
- **Multi-user RBAC, roles, invites** (#14) — os-vps is a single-owner device-approval
  surface; the "RBAC" that matters here is the fs read/write **root jail** + exec guard.
- **shell's file-explorer backend/UI wholesale** (#9) — must-not-disturb.
- **Wholesale appshell merge** — the two appshells diverged (URL-sync, host-api,
  dashboard shell); a bulk merge would fight os-vps's routing/host model. Cherry-pick
  only the self-contained UX pieces named above.

---

## 5. Progress tracker

Update as phases land. (Nothing started yet — this is the baseline.)

| Item | Status | Notes |
|---|---|---|
| P0 Widget framework | ☐ not started | flagship; Phase C |
| P1 Context-menu polish | ☐ not started | Phase A |
| P1 Hot corners | ☐ not started | Phase A |
| P1 Marquee selection | ☐ not started | Phase B |
| P2 Agent execution | ☐ not started | Phase D |
| P2 Force-quit / sounds / HUD | ☐ not started | Phase E |
| P3 MRU history | ☐ not started | Phase A |
| P3 Theme quick-picker | ☐ not started | Phase A |
| P3 Auto-lock | ☐ not started | Phase A |
| P3 Thirds-tiling | ☐ not started | Phase E |
| P4 Windows chrome extras | ☐ not started | Phase E (optional) |
| Deferred: FE sidebar-tree | ⛔ deferred | constraint #2 |
