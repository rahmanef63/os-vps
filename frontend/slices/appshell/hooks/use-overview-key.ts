"use client";

import { useEffect } from "react";

// F3 opens/toggles the shell's window overview (Mission Control on macOS,
// Task View on Windows) — ⌘/Ctrl+Up is taken by maximize. Local to the shell
// that mounts it, so switching shells drops the overlay with the chrome.
export function useOverviewKey(open: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F3") {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
}
