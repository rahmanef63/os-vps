// Public barrel — other slices/app layer import ONLY from here.
export { OsDesktop } from "./components/desktop";
// Bundled single-pane cockpit shell (self-registers as ShellId "dashboard" on
// import — matching rr). Brand comes from <BrandProvider> (useBrand); the file
// is brand-free. macOS/Windows/iOS/Android register from the framework itself.
export { AppIcon } from "./components/app-icon";
export { QuicklinkIcon } from "./components/quicklink-icon";
// Generic app mounter (lazy-loads an app by id + payload). Used by windows AND
// single-pane shells (e.g. the Dashboard shell) so apps mount identically.
export { WindowContent as AppHost } from "./components/window-content";
export { AppRegistryProvider, useApp, useApps } from "./lib/registry";
// Shared viewport virtualization primitive (files-manager list, spotlight, grids).
export { computeViewportWindow, useViewportWindow, type ViewportWindow } from "./lib/use-viewport-window";
// Window lifecycle + the shell-UI actions feature slices drive (search,
// inspector, control-center read these instead of reaching into the store).
export {
  shellStore,
  openWindow,
  closeWindow,
  setCloseGuard,
  focusWindow,
  minimizeWindow,
  restoreWindow,
  setLauncherOpen,
  setSpotlightOpen,
  setInspectorOpen,
  toggleSpotlight,
  toggleInspector,
  setNotificationCenterOpen,
  toggleNotificationCenter,
  applyChromeInsets,
  retileSnapped,
  onSnap,
  snapWindow,
  minimizeAll,
  closeAll,
  serialize,
} from "./lib/store";
export {
  useWindow,
  useWindowOrder,
  useFocused,
  useLauncherOpen,
  useSpotlightOpen,
  useInspectorOpen,
  useNotificationCenterOpen,
  useFocusedApp,
} from "./hooks/use-shell";
// Reusable app-window chrome (all regions optional) + form/preview drawer, so
// every app reads consistently: Sidebar→left Sheet, Inspector→right Sheet on
// narrow containers; <FormDrawer> = dialog on desktop ⇄ bottom drawer on mobile.
export { AppHeader, AppSidebar, AppInspector } from "./components/layout/app-chrome";
export {
  ResponsiveDialog,
  ResponsiveDialog as FormDrawer,
} from "./primitives/responsive-dialog";
export {
  toast, dismissToast, useToasts,
  useNotifications, dismissNotification, clearNotifications, markNotificationsRead,
} from "./lib/toast";
export type { NotificationItem } from "./lib/toast";
export { setActivity, clearActivity, useActivities } from "./lib/activity";
export type { Activity } from "./lib/activity";
// Host-I/O PORT — the generic backend seam. Apps read host data via useOsApi();
// the consumer injects a concrete adapter through HostApiProvider (os-vps wraps
// it in its own OsApiProvider). The OsApi type IS the portability contract.
export { HostApiProvider, useOsApi } from "./lib/host-api";
export type {
  OsApi, Unsub, SysStats, FsEntry, FsRoot, FsList, FsUsage, FsHit,
  UploadFile, UploadResult, UploadProgress, ExecResult, Process, AppManifest,
} from "./lib/host-api";
// F1–F20 window-manager + productivity libs (each module exports its own
// public surface — commands/badges/layouts/recents/window-commands/window-title/
// spaces/window-tabs/clipboard/share/lock/profiles/shortcuts/focus-mode/dnd/quick-look).
export * from "./lib/commands";
export * from "./lib/badges";
export * from "./lib/layouts";
export * from "./lib/recents";
export { useDockPrefs, setDockPrefs, DOCK_SIZE_PX, type DockSize, type DockPrefs } from "./lib/dock-prefs";
export * from "./lib/window-commands";
export * from "./lib/window-title";
export * from "./lib/spaces";
export * from "./lib/window-tabs";
export * from "./lib/clipboard";
export * from "./lib/share";
export * from "./lib/lock";
export * from "./lib/profiles";
export * from "./lib/shortcuts";
export * from "./lib/focus-mode";
export * from "./lib/dnd";
export * from "./lib/quick-look";
export {
  useFocusedHotkey,
  inEditable,
  matchesHotkey,
} from "./lib/use-focused-hotkey";
export type { HotkeyDef, HotkeyOptions } from "./lib/use-focused-hotkey";
// Dynamic per-shell context menu + live-wallpaper registries (the consumer/apps
// register dynamic right-click items + code-defined live wallpapers here).
export { registerContextMenu, getContextMenuItems } from "./lib/context-menu";
export type { MenuItem, ContextMenuCtx, ContextMenuProvider } from "./lib/context-menu";
export { ContextMenu, ShellContextMenu, useContextMenu, useShellContextMenu } from "./components/shells/context-menu";
export { ContextMenuHost } from "./components/shells/context-menu-host";
export { useContextZone, ContextZone, attachZone, collectZones } from "./lib/context-zone";
export type { ZoneCtx, ZoneProvider, ZoneResult } from "./lib/context-zone";
export { resetDesktopIcons, setAddDialog } from "./features/desktop-icons";
export { registerWallpaper, getWallpaper, listWallpapers, useWallpapers } from "./lib/wallpaper-registry";
export type { WallpaperDescriptor, WallpaperProps } from "./lib/wallpaper-registry";
export {
  usePublishInspector,
  publishInspector,
  clearInspector,
  useInspectorInfo,
} from "./lib/inspector";
export type {
  InspectorInfo,
  InspectorProp,
  InspectorAction,
} from "./lib/inspector";
export type { Toast, ToastOptions, ToastTone } from "./lib/toast";
export type { AppDescriptor, AppMenu, AppMenuItem, WindowState, WinId, AppProps } from "./lib/types";
export { appshellConfig } from "./config";
export type { AppShellConfig } from "./config";

// ── Shell registry — the pluggable multi-shell seam (macOS/Windows/iOS/…) ────
// Per-surface preference: the user picks a desktop shell AND a mobile shell; the
// active one is resolved by form factor.
export {
  registerShell,
  getShell,
  shellList,
  shellsForSurface,
  resolveShell,
  surfaceOf,
  setShell,
  useShellPrefs,
  ActiveShellProvider,
  useActiveShell,
} from "./registry/shells";
export type { ShellId, ShellSurface, ShellDescriptor, ShellPrefs, ActiveShell } from "./registry/shells";

// ── Responsive: the single source of truth (provider + hook + container) ─────
export { ResponsiveProvider } from "./responsive/responsive-provider";
export { ResponsiveContext, useResponsive } from "./responsive/use-responsive";
export type {
  Responsive,
  FormFactor,
  DeviceMode,
  Pane,
  SafeArea,
} from "./responsive/use-responsive";
export { useContainer } from "./responsive/use-container";
export { useIsMobile } from "./responsive/use-is-mobile";

// ── DRY responsive primitives (compose these instead of per-app media queries) ─
export { AppFrame } from "./primitives/app-frame";
export { MasterDetail } from "./primitives/master-detail";
export { ResponsiveToolbar } from "./primitives/responsive-toolbar";
export type { ToolbarItem } from "./primitives/responsive-toolbar";
export { TouchList, TouchRow } from "./primitives/touch-list";

// ── Manifest-driven shell: the wrapper provider + feature/slot/brand registry ─
export { AppShell } from "./provider/app-shell";
export { defineFeature } from "./registry/types";
export type {
  ShellManifest,
  FeatureDescriptor,
  SlotRegion,
  Brand,
} from "./registry/types";
export {
  FeatureRegistryProvider,
  useFeatures,
  Slot,
} from "./registry/feature-registry";
export { BrandProvider, useBrand } from "./registry/brand";
export { ShellUIProvider, useShellUI } from "./registry/shell-ui";
export type { ShellUI } from "./registry/shell-ui";
export { ShellConfigProvider, useShellConfig } from "./registry/shell-config";
export type { ShellConfig } from "./registry/shell-config";
export { UrlSync } from "./runtime/use-url-sync";
export {
  CapabilitiesProvider,
  useShellAppearance,
  useCpuPercent,
  useShellSearch,
  useSystemStats,
  useShellChat,
  useServerToggle,
  useQuickLinks,
} from "./registry/capabilities";
export type {
  ShellCapabilities,
  ShellAppearance,
  ThemeMode,
  SearchHit,
  SystemStats,
  ChatMessage,
  ServerToggle,
  QuickLink,
  QuickLinks,
} from "./registry/capabilities";
// Bundled default feature set (appshell/features/*) — re-exported LAST so the
// core bindings the features read (defineFeature etc.) are already live. A
// consumer drops `features: DEFAULT_FEATURES` into its manifest in one line.
export * from "./defaults";
