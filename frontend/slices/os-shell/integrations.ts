"use client";

// Topside's registrations into the appshell runtime registries (lock guard,
// Quick Look previewer, cross-app drop routing). Side-effect module imported
// once from os-root INSIDE the auth boundary — registries are module-level, so
// this runs exactly once per page.
import { createElement } from "react";
import {
  openQuickLook,
  openWindow,
  recordClip,
  registerCommands,
  registerDropHandler,
  registerPreviewer,
  setUnlockGuard,
  deliverDrop,
  serialize,
  share,
  toast,
  AppHost,
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
