"use client";

import { useCallback, useRef, useState, type MouseEvent } from "react";
import type { FsEntry } from "../lib/host";

// Multi-select with cmd/ctrl-toggle and shift-range, plus select-all. Names are
// the identity (a dir has no id in the fs contract). Resets when the dir changes.
export function useFileSelection(entries: FsEntry[] | null) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const lastIndex = useRef<number | null>(null);

  const clear = useCallback(() => setSelected(new Set()), []);
  const selectAll = useCallback(
    () => setSelected(new Set((entries ?? []).map((e) => e.name))),
    [entries],
  );
  const selectOne = useCallback((name: string) => setSelected(new Set([name])), []);

  const onItemClick = useCallback(
    (e: MouseEvent, entry: FsEntry, index: number) => {
      e.stopPropagation();
      if (e.metaKey || e.ctrlKey) {
        setSelected((prev) => {
          const next = new Set(prev);
          next.has(entry.name) ? next.delete(entry.name) : next.add(entry.name);
          return next;
        });
        lastIndex.current = index;
      } else if (e.shiftKey && lastIndex.current != null && entries) {
        const a = Math.min(lastIndex.current, index);
        const b = Math.max(lastIndex.current, index);
        setSelected(new Set(entries.slice(a, b + 1).map((x) => x.name)));
      } else {
        setSelected(new Set([entry.name]));
        lastIndex.current = index;
      }
    },
    [entries],
  );

  return { selected, setSelected, clear, selectAll, selectOne, onItemClick };
}

export type UseFileSelection = ReturnType<typeof useFileSelection>;
