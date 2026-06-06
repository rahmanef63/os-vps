// Topside's shell manifest — the os-vps-specific config that drives the generic
// AppShell. This is the ONE place brand + the built-in app set + shell features
// are declared; appshell core imports none of it. Runtime-installed apps are
// merged on top in os-root (they come from a hook, not static config).
import type { AppDescriptor, Brand, FeatureDescriptor } from "@/features/appshell";
import { searchFeature } from "@/features/shell-search";
import { inspectorFeature } from "@/features/shell-inspector";
import { notificationsFeature } from "@/features/shell-notifications";
import { controlCenterFeature } from "@/features/shell-control-center";
import { widgetsFeature } from "@/features/shell-widgets";
import { filesManagerApp } from "@/features/files-manager";
import { browserApp } from "@/features/browser";
import { codeEditorApp } from "@/features/code-editor";
import { osTerminalApp } from "@/features/os-terminal";
import { mediaStudioApp } from "@/features/media-studio";
import { reelEditorApp } from "@/features/reel-editor";
import { mediaViewerApp } from "@/features/media-viewer";
import { appStoreApp } from "@/features/app-store";
import { createAppApp } from "@/features/create-app";
import { systemMonitorApp } from "@/features/system-monitor";
import { assistantApp } from "@/features/assistant";
import { osSettingsApp } from "@/features/os-settings";

export const TOPSIDE_BRAND: Brand = {
  name: "Topside",
  logo: "rr",
  idleAppName: "Finder",
};

// Preserve the historical localStorage namespace so existing saved layouts
// aren't orphaned (the generic appshell default is "appshell:layout").
export const TOPSIDE_PERSIST_KEY = "os-vps:layout";

// Short URL slug per app for deep-linking (`/files`), assigned here so the app
// slices stay URL-agnostic. Falls back to the app id when unmapped.
const withSlug = (app: AppDescriptor, slug: string): AppDescriptor => ({ ...app, slug });

// Built-in apps (dock order; media-viewer is noDock). Runtime apps append.
export const BUILTIN_APPS: AppDescriptor[] = [
  withSlug(filesManagerApp, "files"),
  withSlug(browserApp, "browser"),
  withSlug(codeEditorApp, "code"),
  withSlug(osTerminalApp, "terminal"),
  withSlug(mediaStudioApp, "studio"),
  withSlug(reelEditorApp, "reel"),
  withSlug(mediaViewerApp, "viewer"),
  withSlug(appStoreApp, "store"),
  withSlug(createAppApp, "create"),
  withSlug(systemMonitorApp, "monitor"),
  withSlug(assistantApp, "assistant"),
  withSlug(osSettingsApp, "settings"),
];

// Shell features — each lives in its own `shell-*` slice and mounts into the
// surfaces via named slots (overlay/rightPanel/notifications/topPill/
// controlCenter/today). Add/remove a feature here = it appears/disappears with
// no surface edit. Settings stays the `os-settings` app (already its own slice).
export const TOPSIDE_FEATURES: FeatureDescriptor[] = [
  searchFeature,
  inspectorFeature,
  notificationsFeature,
  controlCenterFeature,
  widgetsFeature,
];
