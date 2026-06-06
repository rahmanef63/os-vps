// Public barrel — other slices/app layer import ONLY from here.
export { OsDesktop } from "./components/desktop";
export { AppIcon } from "./components/app-icon";
// Generic app mounter (lazy-loads an app by id + payload). Used by windows AND
// single-pane shells (e.g. the Dashboard shell) so apps mount identically.
export { WindowContent as AppHost } from "./components/window-content";
export { AppRegistryProvider, useApp, useApps } from "./lib/registry";
// Window lifecycle + the shell-UI actions feature slices drive (search,
// inspector, control-center read these instead of reaching into the store).
export {
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
} from "./registry/shells";
export type { ShellId, ShellSurface, ShellDescriptor, ShellPrefs } from "./registry/shells";

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
} from "./registry/capabilities";
export type {
  ShellCapabilities,
  ShellAppearance,
  ThemeMode,
  SearchHit,
  SystemStats,
  ChatMessage,
  ServerToggle,
} from "./registry/capabilities";
