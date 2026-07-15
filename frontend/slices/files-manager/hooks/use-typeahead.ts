"use client";

import { useCallback, useRef, type KeyboardEvent } from "react";
import type { FsEntry } from "../lib/host";

// Finder-style type-ahead: bare printable keys jump the selection to the first
// entry whose name starts with the accumulated buffer; the buffer clears after a
// short idle gap. Composed into the list's root onKeyDown alongside the command
// handler — it bails on modifier combos, multi-char keys (Enter/Escape/Arrows…)
// and editable targets, so it never fires while the search box or a rename input
// has focus, and never collides with the ⌘-shortcuts.
const IDLE_MS = 600;

export function useTypeahead(entries: FsEntry[], onMatch: (name: string) => void) {
  const buf = useRef("");
  const timer = useRef<number>(0);

  return useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1) return; // only single printable characters
      const t = e.target as HTMLElement;
      if (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;

      buf.current += e.key.toLowerCase();
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => { buf.current = ""; }, IDLE_MS);

      const hit = entries.find((x) => x.name.toLowerCase().startsWith(buf.current));
      if (!hit) return;
      onMatch(hit.name);
      // ponytail: no same-letter cycling (type more letters to disambiguate);
      // add a match-index ref if repeated-key cycling is ever wanted.
      e.currentTarget
        .querySelector(`[data-name="${CSS.escape(hit.name)}"]`)
        ?.scrollIntoView({ block: "nearest" });
    },
    [entries, onMatch],
  );
}
