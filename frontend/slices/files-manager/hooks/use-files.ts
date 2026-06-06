"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOsApi, type FsEntry, type FsRoot, type FsUsage, type UploadFile } from "@/lib/os-api";
import { toast } from "@/features/os-shell";
import { joinPath, uniqueName } from "../lib/format";
import type { Clipboard } from "../lib/types";

// Home-relative so it expands to ~/.Trash on the live host (inside the write
// roots) and to /.Trash in the mock (whose home IS the root).
export const TRASH_PATH = "~/.Trash";

// Map raw fs errors to something actionable (never mask the real cause — a
// blanket "read-only" hid genuine failures like body-size limits).
const friendly = (msg: string) =>
  msg.includes("writable roots")
    ? "Folder is outside the writable area (OS_FS_WRITE_ROOTS)"
    : msg;

// All filesystem state + mutations for the manager. Every mutation runs through
// `guard`, which surfaces a one-line inline error instead of throwing, then
// reloads the current dir on success.
export function useFiles(initialPath?: string) {
  const api = useOsApi();
  const start = initialPath || "~";
  const [path, setPath] = useState(start);
  const [history, setHistory] = useState<string[]>([start]);
  const [cursor, setCursor] = useState(0);
  const [entries, setEntries] = useState<FsEntry[] | null>(null);
  const [roots, setRoots] = useState<FsRoot[]>([]);
  const [usage, setUsage] = useState<FsUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clip, setClip] = useState<Clipboard | null>(null);
  const reloadRef = useRef(0);
  const [reload, setReload] = useState(0);

  const refresh = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    setEntries(null);
    api.fs
      .list(path)
      .then((res) => {
        if (!alive) return;
        setEntries(res.entries);
        if (res.roots?.length) setRoots(res.roots);
      })
      .catch(() => {
        if (alive) setEntries([]);
      });
    return () => {
      alive = false;
    };
  }, [api, path, reload]);

  useEffect(() => {
    let alive = true;
    api.fs.usage().then((u) => alive && setUsage(u)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [api, reload]);

  const navigate = useCallback(
    (next: string) => {
      setHistory((h) => {
        const trimmed = h.slice(0, cursor + 1);
        setCursor(trimmed.length);
        return [...trimmed, next];
      });
      setPath(next);
    },
    [cursor],
  );
  const goBack = useCallback(() => {
    if (cursor === 0) return;
    setCursor(cursor - 1);
    setPath(history[cursor - 1]);
  }, [cursor, history]);
  const goForward = useCallback(() => {
    if (cursor >= history.length - 1) return;
    setCursor(cursor + 1);
    setPath(history[cursor + 1]);
  }, [cursor, history]);

  const guard = useCallback(
    async (run: () => Promise<unknown>) => {
      setError(null);
      try {
        await run();
        reloadRef.current += 1;
        setReload((n) => n + 1);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(friendly(msg));
      }
    },
    [],
  );

  const taken = useMemo(
    () => new Set((entries ?? []).map((e) => e.name)),
    [entries],
  );

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
    const op = clip.mode === "cut" ? api.fs.move : api.fs.copy;
    return guard(async () => {
      for (const name of clip.names) {
        await op(joinPath(clip.from, name), joinPath(path, uniqueName(taken, name)));
      }
      setClip(null);
    });
  }, [api, clip, guard, path, taken]);

  return {
    api,
    path,
    entries,
    roots,
    usage,
    error,
    clip,
    canBack: cursor > 0,
    canForward: cursor < history.length - 1,
    setError,
    setClip,
    navigate,
    goBack,
    goForward,
    refresh,
    mkdir,
    upload,
    move,
    trash,
    emptyTrash,
    rename,
    remove,
    paste,
  };
}

export type UseFiles = ReturnType<typeof useFiles>;
