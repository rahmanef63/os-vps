# Shell layout kit

Reusable, **optional** app-window chrome so every app reads consistently and
mobile behaviour is uniform. Exported from `@/features/os-shell`.

## Primitives

| Export | Desktop | Mobile (`useIsMobile`, <768px) | Use for |
|---|---|---|---|
| `AppHeader` | top toolbar bar | same | app title + controls |
| `AppSidebar` | left rail (hide via `railOpen={false}`) | **left Sheet** | navigation / file tree |
| `AppInspector` | right rail (hide via `railOpen`) | **right Sheet** (or `mobile="drawer"` → non-modal bottom drawer) | properties / layers / details |
| `FormDrawer` (= `ResponsiveDialog`) | centered Dialog | **bottom Drawer** | create/edit forms · previews |

Rules of thumb (the correction that drove this):
- **Sidebar → Sheet** (never a bottom drawer).
- **Inspector / property → Sheet** (right).
- **Form / preview → Drawer** (bottom) via `FormDrawer`.

`AppInspector` also takes `mobile` (`"sheet"` default | `"drawer"`) + optional
`mobileHeight` (default `h-[50dvh]`). `mobile="drawer"` renders a **non-modal,
overlay-less bottom drawer** so the canvas/preview above it stays visible and
interactive while you edit (image editor uses this). Squeeze the canvas into the
visible half by padding it `pb-[50dvh]` while the drawer is open.

`AppSidebar` / `AppInspector` take `open` + `onOpenChange` (the mobile Sheet) and
`railOpen` (desktop show/hide). Apps that toggle a panel on both form factors
branch the handler with `useIsMobile()`:

```tsx
onTogglePanel={() => (isMobile ? setSheet(true) : setRailOpen((o) => !o))}
```

`FormDrawer` is compound: `FormDrawer.Header/Title/Description/Body/Footer`,
`variant` `modal|panel|alert`, `size` `sm|md|lg|xl|full`.

## Per-app status (audit 2026-05-30)

| App | Sidebar | Inspector/property | Form/preview |
|---|---|---|---|
| files-manager | ✅ `AppSidebar` (sheet) | FileDetails strip (inline, small) | media preview = window |
| code-editor | ✅ `AppSidebar` (sheet) | StatusBar (bottom) | ✅ NewFile = `FormDrawer` |
| media-studio | ToolRail (always) | ✅ `AppInspector` (`mobile="drawer"`, 50dvh) | ✅ Export = `FormDrawer` |
| reel-editor | — | ✅ `AppInspector` (sheet) | RenderOverlay (progress) |
| media-viewer | — | — | toolbar + stage (fits) |
| app-store | StoreSidebar `@max:hidden` | — | — |
| assistant | — | — | forms = full-screen views ⟶ TODO `FormDrawer` |
| browser | — | — | HistoryView overlay ⟶ TODO `FormDrawer` |
| system-monitor / os-settings / os-terminal / create-app | — | — | content-first (container queries) |

### Remaining (low priority)
- assistant Skill/Agent/Automation forms → `FormDrawer` (currently full-screen state swap).
- browser HistoryView → `FormDrawer`.
- app-store StoreSidebar → `AppSidebar` if a mobile category drawer is wanted.
