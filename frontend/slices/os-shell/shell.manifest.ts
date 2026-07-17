// Topside's shell manifest — the os-vps-specific config that drives the generic
// AppShell. This is the ONE place brand + the built-in app set + shell features
// are declared; appshell core imports none of it. Runtime-installed apps are
// merged on top in os-root (they come from a hook, not static config).
import type { AppDescriptor, Brand, FeatureDescriptor } from "@/features/appshell";
import { DEFAULT_FEATURES } from "@/features/appshell";
import { filesManagerApp } from "@/features/files-manager";
import { browserApp } from "@/features/browser";
import { codeEditorApp } from "@/features/code-editor";
import { osTerminalApp, claudeCodeApp } from "@/features/os-terminal";
import { mediaStudioApp } from "@/features/media-studio";
import { reelEditorApp } from "@/features/reel-editor";
import { mediaViewerApp } from "@/features/media-viewer";
import { appStoreApp } from "@/features/app-store";
import { createAppApp } from "@/features/create-app";
import { systemMonitorApp } from "@/features/system-monitor";
import { assistantApp } from "@/features/assistant";
import { osSettingsApp } from "@/features/os-settings";
import { quicklinksApp } from "@/features/quicklinks";
import { themeQuickPickerFeature } from "./theme-quick-picker";

export const TOPSIDE_BRAND: Brand = {
  name: "MSO",
  logo: "M",
  idleAppName: "Finder",
};

// Preserve the historical localStorage namespace so existing saved layouts
// aren't orphaned (the generic appshell default is "appshell:layout").
export const TOPSIDE_PERSIST_KEY = "os-vps:layout";

// Short URL slug per app for deep-linking (`/files`), assigned here so the app
// slices stay URL-agnostic. Falls back to the app id when unmapped.
const withSlug = (app: AppDescriptor, slug: string): AppDescriptor => ({ ...app, slug });
// Pinned = the mobile dock / quick-shortcut set (appshell stays id-agnostic).
const pin = (app: AppDescriptor): AppDescriptor => ({ ...app, pinned: true });

// Built-in apps (dock order; media-viewer is noDock). Runtime apps append.
export const BUILTIN_APPS: AppDescriptor[] = [
  pin(withSlug(filesManagerApp, "files")),
  withSlug(browserApp, "browser"),
  withSlug(codeEditorApp, "code"),
  pin(withSlug(osTerminalApp, "terminal")),
  pin(withSlug(claudeCodeApp, "claude")),
  withSlug(mediaStudioApp, "studio"),
  withSlug(reelEditorApp, "reel"),
  withSlug(mediaViewerApp, "viewer"),
  withSlug(appStoreApp, "store"),
  withSlug(createAppApp, "create"),
  pin(withSlug(systemMonitorApp, "monitor")),
  withSlug(assistantApp, "assistant"),
  withSlug(quicklinksApp, "links"),
  pin(withSlug(osSettingsApp, "settings")),
];

// Shell features — the generic brand-free set now lives INSIDE the appshell
// slice (appshell/features/*) and ships as one bundle, DEFAULT_FEATURES. os-vps
// uses them verbatim; trim/extend by spreading ([...DEFAULT_FEATURES, …]). Each
// mounts into a named slot (overlay/rightPanel/notifications/topPill/
// controlCenter/today), so a feature absent from the array just doesn't render.
// Settings stays the `os-settings` app (its own slice). os-vps adds one consumer
// feature: a compact theme-preset switcher in the menu-bar status cluster.
export const TOPSIDE_FEATURES: FeatureDescriptor[] = [...DEFAULT_FEATURES, themeQuickPickerFeature];
