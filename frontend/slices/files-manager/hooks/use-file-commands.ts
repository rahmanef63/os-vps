"use client";

import { useCallback, useState, type KeyboardEvent, type MouseEvent } from "react";
import { openWindow, toast } from "@/features/os-shell";
import { rawUrl, type FsEntry } from "../lib/host";
import { appForFile, mediaKind } from "../lib/icons";
import { joinPath, parentPath } from "../lib/format";
import { TRASH_PATH, type UseFiles } from "./use-files";
import type { UseFileSelection } from "./use-file-selection";
import type { ContextState } from "../lib/types";

// All user commands (open, clipboard, trash, keyboard) bound to the current fs
// + selection. Keeps app.tsx focused on layout. `del` moves to Trash from a
// normal dir but hard-deletes (with confirm) when already inside Trash.
export function useFileCommands(fs: UseFiles, sel: UseFileSelection) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [ctx, setCtx] = useState<ContextState | null>(null);
  const inTrash = fs.path === TRASH_PATH;

  const go = useCallback(
    (path: string) => {
      fs.navigate(path);
      sel.clear();
    },
    [fs, sel],
  );

  const open = useCallback(
    (entry: FsEntry) => {
      if (entry.kind === "dir") return go(joinPath(fs.path, entry.name));
      const app = appForFile(entry);
      if (!app) return;
      const path = joinPath(fs.path, entry.name);
      if (app === "code-editor") openWindow(app, entry.name, undefined, { path });
      else openWindow(app, entry.name, undefined, { path, name: entry.name, kind: mediaKind(entry) });
    },
    [fs.path, go],
  );

  // Open by absolute path (from the sidebar tree, which yields full paths).
  // Routes known exts to their app via the same openWindow flow as `open`;
  // unknown types just navigate to the file's parent dir.
  const openPath = useCallback(
    (full: string) => {
      const name = full.split("/").filter(Boolean).pop() ?? "";
      const ext = name.includes(".") ? name.split(".").pop() : undefined;
      const entry: FsEntry = { name, kind: "file", size: 0, ext };
      const app = appForFile(entry);
      if (!app) return go(parentPath(full));
      if (app === "code-editor") openWindow(app, name, undefined, { path: full });
      else openWindow(app, name, undefined, { path: full, name, kind: mediaKind(entry) });
    },
    [go],
  );

  const onContext = useCallback(
    (e: MouseEvent, entry: FsEntry | null) => {
      e.preventDefault();
      e.stopPropagation();
      if (entry && !sel.selected.has(entry.name)) sel.selectOne(entry.name);
      setCtx({ x: e.clientX, y: e.clientY, entry });
    },
    [sel],
  );

  const targets = useCallback(() => {
    if (!ctx?.entry) return [];
    return sel.selected.has(ctx.entry.name) ? [...sel.selected] : [ctx.entry.name];
  }, [ctx, sel.selected]);

  const cut = useCallback((names: string[]) => fs.setClip({ mode: "cut", names, from: fs.path }), [fs]);
  const copy = useCallback((names: string[]) => fs.setClip({ mode: "copy", names, from: fs.path }), [fs]);

  // Download a file's raw bytes via a hidden <a download> — the browser's native
  // download manager handles progress (streaming a big file through JS just to
  // draw a bar would buffer it all in RAM). Dirs aren't downloadable (no archive
  // endpoint). The raw route is cookie-authed same-origin; demo serves
  // /demo-media/* statically. A toast acknowledges the start (the click is
  // fire-and-forget — there's no completion event from <a download>).
  const download = useCallback(
    (entry: FsEntry | null) => {
      if (!entry) return;
      if (entry.kind !== "file") {
        toast("Folders can't be downloaded yet", { tone: "error" });
        return;
      }
      const a = document.createElement("a");
      a.href = rawUrl(joinPath(fs.path, entry.name));
      a.download = entry.name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast(`Downloading ${entry.name}…`);
    },
    [fs.path],
  );
  const del = useCallback(
    (names: string[]) => {
      if (inTrash) {
        if (!window.confirm(`Permanently delete ${names.length} item${names.length > 1 ? "s" : ""}?`)) return;
        fs.remove(names);
      } else {
        fs.trash(names);
      }
      sel.clear();
    },
    [fs, inTrash, sel],
  );
  const emptyTrash = useCallback(() => {
    if (window.confirm("Permanently delete all items in Trash?")) {
      fs.emptyTrash();
      sel.clear();
    }
  }, [fs, sel]);
  const doRename = useCallback(
    (from: string, to: string) => {
      setRenaming(null);
      const name = to.trim();
      if (!name || name === from) return; // no-op rename → skip the round-trip
      // POSIX rename clobbers the target — refuse a collision with a sibling
      // instead of silently overwriting it (surface the same inline error bar).
      if (fs.entries?.some((e) => e.name === name)) {
        fs.setError("Name already exists");
        return;
      }
      fs.rename(from, name);
    },
    [fs],
  );

  // New Folder → create, select, and drop straight into inline rename so the
  // user just types the name and hits Enter (one action, not three clicks).
  const newFolder = useCallback(async () => {
    const name = await fs.mkdir();
    sel.selectOne(name);
    setRenaming(name);
  }, [fs, sel]);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (renaming) return;
      const mod = e.metaKey || e.ctrlKey;
      const names = [...sel.selected];
      if (mod && e.key === "a") {
        e.preventDefault();
        sel.selectAll();
      } else if (mod && e.key === "c" && names.length) copy(names);
      else if (mod && e.key === "x" && names.length) cut(names);
      else if (mod && e.key === "v") fs.paste();
      else if (e.key === "Enter" && names.length === 1) setRenaming(names[0]);
      else if ((e.key === "Backspace" || e.key === "Delete") && names.length) {
        e.preventDefault();
        del(names);
      } else if (e.key === "Escape") {
        sel.clear();
        fs.setClip(null);
      }
    },
    [copy, cut, del, fs, renaming, sel],
  );

  return {
    renaming, setRenaming, ctx, setCtx, inTrash,
    go, open, openPath, onContext, targets, cut, copy, del, download, emptyTrash, doRename, newFolder, onKey,
  };
}
