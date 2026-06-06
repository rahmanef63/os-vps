# os-vps — Slice Catalog

Every OS *app* is an rr vertical slice. Slices are authored lift-ready (props-driven,
no hardcoded consumer URLs/env/roles) so `rr-prep` + `rr-send` can promote them into
`resources/` with a catalog entry + validated metadata trio.

> **Note:** the original catalog keyed slices to Convex features. Convex was
> removed — slices now read the host through the `lib/os-api` contract, which is
> served by `lib/host` (fs/exec/sys) or `MockAdapter`. The "feature" column below
> is the host contract group, not a Convex table.

## Built (14 app slices)

| Slug | Kind | Category | Host contract | Purpose |
|------|------|----------|---------------|---------|
| `os-shell` | full | ui | — (localStorage layout) | Window manager + iOS mobile shell: menu bar, glass dock, traffic-light windows + edge-snap/maximize, launcher, Spotlight ⌘K, Control Center, Dynamic Island, AI Inspector. The surface every app mounts into. |
| `system-monitor` | full | infra | `sys` | CPU / RAM / disk gauges + sparklines + process table, via OsApi `sys`. |
| `os-terminal` | full | infra | `exec` | Terminal wired to OsApi `exec.run` (one-shot); built-in fs commands in Live. |
| `files-manager` | full | infra | `fs` | Finder-style browser: list/usage, CRUD, cut/copy/paste, Trash, DnD upload (files+folders), favorites + storage bar. |
| `code-editor` | full | infra | `fs` | Multi-tab editor + live file-tree (`fs.read/write`), syntax highlight, Cmd+S. |
| `browser` | full | infra | `browser` | Remote view of the real Playwright Chromium (`os-browser`): live screenshot, click/keyboard/scroll forwarded. |
| `media-viewer` | full | ui | `fs` (`raw`) | Image (zoom) / video / audio / pdf preview; open-in-editor handoff. |
| `media-studio` | full | ui | — (client) | Canvas image editor: layers, filters, masks, JSON/HTML export, undo/redo. |
| `reel-editor` | full | ui | — (client) | Timeline video editor; real client-side Canvas→MediaRecorder render. |
| `assistant` | full | ui | `/api/assistant` | "Alfa" chat over the real Claude stream (BYOK); agents/skills/automations editors. |
| `app-store` | full | ui | — (localStorage) | Catalog + install toggle → dynamic app registry. |
| `create-app` | full | ui | — (localStorage) | Manifest form → registers a runtime app into the dock. |
| `os-settings` | full | ui | — (local) | Theme/accent/dir/wallpaper/reduce-glass/device; server mode (mock\|live); Devices; AI BYOK key; About + Reset. |
| `auth` | full | ui | `/api/auth` | Login screen (password) + device-pending panel + auth gate. |

Shared host boundary: `lib/os-api/` (MockAdapter ↔ HttpAdapter) → `lib/host`.
Shared appearance: `lib/appearance/`. See `ARCHITECTURE.md` + `DESIGN-RECONCILE.md`.

## Shell framework (Phase 17 — manifest-driven, rr-liftable)

The shell is no longer one slice. `appshell` is the generic, brand-free framework
(the part that lifts to rr); shell features are their own slices; `os-shell` is the
os-vps consumer that wires them via a manifest.

| Slug | Kind | Role |
|------|------|------|
| `appshell` | full | Generic shell framework: `<AppShell manifest>` wrapper, window runtime, desktop + mobile surfaces, app/feature/brand registries, `<Slot>`, `ResponsiveProvider` + `useResponsive` + DRY primitives, and the pub/sub buses (toast/activity/inspector). Imports no brand or feature. |
| `shell-search` | full | Spotlight ⌘K command palette → `overlay` slot. |
| `shell-inspector` | full | App-context panel + scoped AI chat → `rightPanel` slot (bus in core). |
| `shell-notifications` | full | Toast stack → `notifications`; Dynamic Island → `topPill`. |
| `shell-control-center` | full | iOS pull-down toggles → `controlCenter` slot (mobile). |
| `shell-widgets` | full | Today widgets + quick-open → `today` slot (mobile). |
| `shell-settings` | full | Settings building blocks (`SettingsSection`/`SettingsRow`/`AppearancePanel`) consumed by the `os-settings` app — a component library slice, intentionally NOT listed in `TOPSIDE_FEATURES` (it owns no slot). |
| `os-shell` | full | os-vps consumer: `shell.manifest.ts` (Topside brand + app list + features) + a re-export barrel (`@/features/os-shell`) so app slices need no edits. |

A feature plugs in by exporting `defineFeature({ id, slots, provider? })` and being
listed in `TOPSIDE_FEATURES`. Settings stays the `os-settings` app.

**Lift status:** `appshell` **and** every `shell-*` feature slice are brand- AND
consumer-free. Brand, persist key and idle name come from the manifest; everything
project-specific is injected via `manifest.capabilities` (`ShellCapabilities`):
appearance (theme/device/wallpaper), the menu-bar CPU readout, Spotlight search
(`useSearch` → `SearchHit[]`), Today telemetry (`useSystemStats`), scoped AI chat
(`useChat`), and the control-center server tile (`useServerToggle`, optional). os-vps
adapts its store + host API + AI stream in `os-shell/capabilities.ts`. The only
remaining `@/lib` import anywhere in the shell is `@/lib/utils` (the universal shadcn
`cn` helper, which every rr project provides). `appshell` has its metadata trio.
Ready for `rr-prep`/`rr-send` (a separate step).

## Backlog (not built)

| Slug | Category | Notes |
|------|----------|-------|
| `process-list` | infra | dedicated `ps`/`top` view (system-monitor has a basic table today). |
| `docker-apps` | infra | container list/start/stop via the host docker socket. |
| `logs-viewer` | infra | journalctl / file tail streaming (SSE). |
| `notifications` | ui | toast + activity center (toast store + AI Inspector exist; no full center). |

## Metadata trio (per slice — rr contract)

- **`slice.json`** — schema-validated metadata: slug, version, kind, namespace,
  `frontend.slicePath`, `deps` (npm / shadcn / env / peers), `audit`, `tags`.
  (The rr schema also allows a `convex.*` block for Convex-backed slices; os-vps
  slices are host-backed, so that block is empty/omitted.)
- **`slice.contract.ts`** — typed DSL: `requires` (auth, rbac, env, convex tables,
  dep slices) + `provides` (routes, hooks, components, tables).
- **`slice.manifest.json`** — CLI distribution payload (file list + install targets);
  generated by `rr` tooling on lift, hand-stubbed here.

## Cross-slice rules

- Other slices import an app only via its barrel `@/features/<slug>`.
- `os-shell` exposes an **app-registration hook** so apps register into the launcher/dock
  without `os-shell` importing them (open/closed). Registry entry = `{ id, title, icon, load }`.
- Shared primitives promote to `@/shared/*` on the **second** occurrence, not the third.

## Lift checklist (Phase 4)

1. `rr-prep <slug>` — strip consumer URLs/env names/role enums → props/env allowlist.
2. Validate trio: `slice.json` schema, contract drift, manifest, file-size audit.
3. `rr-send <slug>` — push up; add catalog entry in `resources/lib/content/slices.ts`.
4. `npm run validate:all` in `resources/` (audit:slices + audit:convex-features).
