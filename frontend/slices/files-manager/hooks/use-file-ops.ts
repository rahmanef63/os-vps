"use client";

import { useCallback } from "react";
import type { OsApi, UploadFile } from "@/lib/os-api";
import { toast } from "@/features/os-shell";
import { joinPath, uniqueName } from "../lib/format";
import type { Clipboard } from "../lib/types";

// Home-relative so it expands to ~/.Trash on the live host (inside the write
// roots) and to /.Trash in the mock (whose home IS the root).
export const TRASH_PATH = "~/.Trash";

type Guard = (run: () => Promise<unknown>) => Promise<void>;

// The filesystem mutations for the manager, all run through the caller's
// `guard` (inline error + reload on success). `taken` = names in the current
// dir, used to de-duplicate created/pasted names Finder-style.
export function useFileOps(opts: {
  api: OsApi;
  guard: Guard;
  path: string;
  taken: Set<string>;
  clip: Clipboard | null;
  setClip: (clip: Clipboard | null) => void;
}) {
  const { api, guard, path, taken, clip, setClip } = opts;

  // Returns the created name so the caller can immediately select + rename it
  // (Finder-style: New Folder → type name → Enter, no extra clicks).
  const mkdir = useCallback(
    async (name = "untitled folder") => {
      const finalName = uniqueName(taken, name);
      await guard(() => api.fs.mkdir(joinPath(path, finalName)));
      return finalName;
    },
    [api, guard, path, taken],
  );
  // Upload files/folders (binary-safe) into `dest` (defaults to the current dir;
  // a drop onto a folder passes that folder's path). Structure is kept server-side.
  const upload = useCallback(
    (files: UploadFile[], dest: string = path) => {
      if (!files.length) return;
      const label = `${files.length} item${files.length > 1 ? "s" : ""}`;
      toast(`Uploading ${label}…`);
      return guard(async () => {
        const res = await api.fs.upload(dest, files);
        const n = res && typeof res.written === "number" ? res.written : files.length;
        toast(`Uploaded ${n} item${n === 1 ? "" : "s"}`, { tone: "success" });
      });
    },
    [api, guard, path],
  );
  // Move a set of names from the current dir into `destPath` (drag-drop target).
  const move = useCallback(
    (names: string[], destPath: string) => {
      if (destPath === path) return Promise.resolve();
      return guard(async () => {
        const list = await api.fs.list(destPath);
        const seen = new Set(list.entries.map((e) => e.name));
        for (const name of names) {
          const to = uniqueName(seen, name);
          seen.add(to);
          await api.fs.move(joinPath(path, name), joinPath(destPath, to));
        }
      });
    },
    [api, guard, path],
  );
  // Move selected names into the Trash folder instead of hard-deleting.
  const trash = useCallback(
    (names: string[]) =>
      guard(async () => {
        const list = await api.fs.list(TRASH_PATH).catch(() => ({ entries: [] }));
        const seen = new Set(list.entries.map((e) => e.name));
        for (const name of names) {
          const to = uniqueName(seen, name);
          seen.add(to);
          await api.fs.move(joinPath(path, name), joinPath(TRASH_PATH, to));
        }
      }),
    [api, guard, path],
  );
  // Permanently remove everything currently in Trash.
  const emptyTrash = useCallback(
    () =>
      guard(async () => {
        const list = await api.fs.list(TRASH_PATH).catch(() => ({ entries: [] }));
        await Promise.all(
          list.entries.map((e) => api.fs.remove(joinPath(TRASH_PATH, e.name))),
        );
      }),
    [api, guard],
  );
  const rename = useCallback(
    (from: string, to: string) =>
      guard(() => api.fs.move(joinPath(path, from), joinPath(path, to))),
    [api, guard, path],
  );
  const remove = useCallback(
    (names: string[]) => guard(() => Promise.all(names.map((n) => api.fs.remove(joinPath(path, n))))),
    [api, guard, path],
  );
  const paste = useCallback(() => {
    if (!clip) return;
    // Cutting then pasting back into the SAME folder is a no-op — moving each
    // file onto itself would (via uniqueName) rename it to "name copy". Bail.
    if (clip.mode === "cut" && clip.from === path) {
      setClip(null);
      return;
    }
    const op = clip.mode === "cut" ? api.fs.move : api.fs.copy;
    return guard(async () => {
      for (const name of clip.names) {
        await op(joinPath(clip.from, name), joinPath(path, uniqueName(taken, name)));
      }
      setClip(null);
    });
  }, [api, clip, guard, path, setClip, taken]);

  return { mkdir, upload, move, trash, emptyTrash, rename, remove, paste };
}
