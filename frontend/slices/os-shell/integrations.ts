"use client";

// Topside's registrations into the appshell runtime registries (lock guard,
// Quick Look previewer, cross-app drop routing). Side-effect module imported
// once from os-root INSIDE the auth boundary — registries are module-level, so
// this runs exactly once per page.
import { createElement } from "react";
import { Activity, Expand, FolderPlus, Lock, Shrink, Wallpaper as WallpaperIcon } from "lucide-react";
import {
  lock,
  openQuickLook,
  openWindow,
  recordClip,
  registerCommands,
  registerContextMenu,
  registerDropHandler,
  registerPreviewer,
  setShell,
  setUnlockGuard,
  shellsForSurface,
  deliverDrop,
  serialize,
  share,
  toast,
  AppHost,
  type MenuItem,
} from "@/features/appshell";

// Unlock = the signed session cookie is still valid. A dead session falls
// through to false; the user reloads and lands on the login gate instead.
setUnlockGuard(async () => {
  try {
    return (await fetch("/api/auth/me", { cache: "no-store" })).ok;
  } catch {
    return false;
  }
});

// Quick Look: `{ path, kind? }` targets render the media-viewer app inline in
// the overlay (same component a full viewer window would mount).
registerPreviewer({
  id: "media-viewer",
  canPreview: (t) =>
    !!t && typeof t === "object" && typeof (t as { path?: unknown }).path === "string",
  render: (t) => createElement(AppHost, { app: "media-viewer", payload: t }),
});

// Topside's dynamic right-click items — merged AFTER each shell's built-ins by
// the context-menu registry. One provider for every shell ("*", surface-aware)
// plus a dashboard-specific group; providers run at open time so disabled
// states / labels can read live data.
registerContextMenu("*", (ctx) => {
  const items: MenuItem[] = [];
  if (ctx.surface === "desktop") {
    items.push({
      label: "New Files window",
      icon: FolderPlus,
      onClick: () => openWindow("files-manager", "Files", undefined, { path: "~" }, { multi: true }),
    });
  }
  items.push({
    label: "Change wallpaper…",
    icon: WallpaperIcon,
    onClick: () => openWindow("os-settings", "Settings"),
  });
  if (ctx.surface === "mobile") items.push({ label: "Lock screen", icon: Lock, onClick: lock });
  // "View as …" — switch the active shell persona for this surface (desktop:
  // macOS/Windows/Dashboard, mobile: iOS/Android), excluding the current one.
  for (const s of shellsForSurface(ctx.surface)) {
    if (s.id !== ctx.shell) {
      items.push({ label: `View as ${s.label}`, icon: s.icon, onClick: () => setShell(ctx.surface, s.id) });
    }
  }
  // Full-screen the whole cockpit (read live so the label reflects current state).
  const inFs = typeof document !== "undefined" && !!document.fullscreenElement;
  items.push({
    label: inFs ? "Exit Full Screen" : "Enter Full Screen",
    icon: inFs ? Shrink : Expand,
    onClick: () => {
      if (inFs) void document.exitFullscreen?.();
      else void document.documentElement.requestFullscreen?.().catch(() => {});
    },
  });
  return items;
});
registerContextMenu("dashboard", () => [
  { label: "Open System Monitor", icon: Activity, onClick: () => openWindow("system-monitor", "System Monitor") },
]);

// Cross-app DnD: a `{ kind: "path" }` payload dropped on Files opens an
// explorer window at that path (files-manager already honors the payload).
registerDropHandler("files-manager", {
  accepts: (d) => d.kind === "path" && typeof d.path === "string",
  onDrop: (d) =>
    openWindow("files-manager", "Files", undefined, { path: d.path as string }, { multi: true }),
});

// Headless e2e seam — ?e2e=1 registers palette commands that exercise the
// shell registries without coordinate-clicking app UIs (scripts/e2e/*).
if (typeof location !== "undefined" && new URLSearchParams(location.search).has("e2e")) {
  registerCommands("e2e", [
    { id: "e2e:notify", label: "E2E: fire test notification", hint: "Dev",
      run: () => toast("E2E test notification", { appId: "files-manager", duration: 5000 }) },
    { id: "e2e:quick-look", label: "E2E: quick look sample", hint: "Dev",
      run: () => openQuickLook("Quick Look sample body — registry fallback previewer.") },
    { id: "e2e:clip", label: "E2E: record clipboard sample", hint: "Dev",
      run: () => recordClip("E2E clipboard sample text") },
    { id: "e2e:share", label: "E2E: share sample", hint: "Dev",
      run: () => share("E2E share payload") },
    { id: "e2e:drop", label: "E2E: simulate cross-app drop", hint: "Dev",
      run: () => {
        const ok = deliverDrop("files-manager", { kind: "path", path: "~" });
        toast(ok ? "Drop delivered to Files" : "Drop refused");
      } },
    { id: "e2e:bounds", label: "E2E: report window bounds", hint: "Dev",
      run: () => {
        const bad = serialize().filter(
          (w) => w.x < 0 || w.y < 0 || w.x + w.w > innerWidth || w.y + w.h > innerHeight,
        );
        toast(bad.length ? `e2e:bounds bad ${bad.map((w) => w.id).join(",")}` : `e2e:bounds ok n=${serialize().length}`, { duration: 5000 });
      } },
  ]);
}
