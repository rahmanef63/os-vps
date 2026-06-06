"use client";

import { useCallback, useState } from "react";
import { useOsApi } from "./host";
import { SEED_FILES } from "./seed";
import { baseName, joinPath } from "./util";

export type SaveState = "idle" | "saved" | "error";

// Owns the editor's working state: the in-memory "disk" (last saved text per
// path), live working buffers, the open-tab list, and the active tab. FS reads
// hydrate a buffer; FS writes are best-effort (live host may be read-only).
export function useEditor() {
  const api = useOsApi();
  const [disk, setDisk] = useState<Record<string, string>>({ ...SEED_FILES });
  const [buffers, setBuffers] = useState<Record<string, string>>({});
  const [tabs, setTabs] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const open = useCallback(
    (path: string) => {
      setTabs((t) => (t.includes(path) ? t : [...t, path]));
      setActive(path);
      setBuffers((b) => {
        if (path in b) return b;
        const seed = disk[path] ?? SEED_FILES[path] ?? "";
        return { ...b, [path]: seed };
      });
      // Best-effort live hydrate; ignore failures (mock / missing file).
      api.fs
        .read(path)
        .then((content) => {
          if (typeof content === "string" && content.length) {
            setDisk((d) => ({ ...d, [path]: content }));
            setBuffers((b) => (b[path] ? b : { ...b, [path]: content }));
          }
        })
        .catch(() => {});
    },
    [api, disk],
  );

  // Payload-driven open (cross-app "open this file"): add a tab, make it
  // active, and explicitly read content. On a live read-only / fetch failure
  // surface the existing read-only status note instead of silently ignoring.
  const openPath = useCallback(
    (path: string) => {
      setTabs((t) => (t.includes(path) ? t : [...t, path]));
      setActive(path);
      setBuffers((b) => (path in b ? b : { ...b, [path]: disk[path] ?? "" }));
      api.fs
        .read(path)
        .then((content) => {
          if (typeof content === "string") {
            setDisk((d) => ({ ...d, [path]: content }));
            setBuffers((b) => ({ ...b, [path]: content }));
            setSaveState("idle");
          }
        })
        .catch(() => setSaveState("error"));
    },
    [api, disk],
  );

  const close = useCallback(
    (path: string) => {
      setTabs((t) => {
        const i = t.indexOf(path);
        const next = t.filter((x) => x !== path);
        setActive((a) =>
          a === path ? (next[i] ?? next[i - 1] ?? null) : a,
        );
        return next;
      });
    },
    [],
  );

  const edit = useCallback(
    (value: string) => {
      if (active == null) return;
      setBuffers((b) => ({ ...b, [active]: value }));
      setSaveState("idle");
    },
    [active],
  );

  const create = useCallback(
    (dir: string, name: string) => {
      const path = joinPath(dir, name.trim());
      setDisk((d) => ({ ...d, [path]: d[path] ?? "" }));
      open(path);
    },
    [open],
  );

  const save = useCallback(
    async (path = active) => {
      if (path == null) return;
      const value = buffers[path] ?? "";
      setDisk((d) => ({ ...d, [path]: value }));
      try {
        await api.fs.write(path, value);
        setSaveState("saved");
      } catch {
        // Live host may be read-only; keep the local save, flag the write.
        setSaveState("error");
      }
    },
    [active, api, buffers],
  );

  const value = active != null ? (buffers[active] ?? "") : "";
  const dirty = active != null && buffers[active] !== disk[active];

  return {
    tabs,
    active,
    value,
    dirty,
    saveState,
    buffers,
    disk,
    open,
    openPath,
    close,
    edit,
    create,
    save,
    setActive,
    label: (p: string) => baseName(p),
  };
}
