"use client";

import { useSyncExternalStore } from "react";

// Dynamic command registry — the seam that lets ANY layer (apps, bundled
// features, shells, the consumer) contribute palette actions at runtime.
// Same external-store pattern as lib/activity.ts / lib/toast.ts: register
// under a source key (replaces that source's previous set), get back an
// unregister fn. The Spotlight palette merges these with its built-ins.

export type ShellCommand = {
  /** Globally unique — namespace by source (e.g. "shell:switch-windows"). */
  id: string;
  label: string;
  /** Kind tag shown right-aligned in the palette (defaults to "Action"). */
  hint?: string;
  /** Extra match terms beyond the label. */
  keywords?: string;
  run: () => void;
};

let commands: ShellCommand[] = [];
const sources = new Map<string, ShellCommand[]>();
const subs = new Set<() => void>();

function emit() {
  commands = [...sources.values()].flat();
  subs.forEach((f) => f());
}

/**
 * Contribute `cmds` under `source` (replacing that source's previous set —
 * re-registering is how a source updates its commands). Returns an
 * unregister fn that removes the set iff it is still the current one.
 */
export function registerCommands(source: string, cmds: ShellCommand[]): () => void {
  sources.set(source, cmds);
  emit();
  return () => {
    if (sources.get(source) === cmds) {
      sources.delete(source);
      emit();
    }
  };
}

/** Current dynamic commands (registration order, grouped by source). */
export function getCommands(): ShellCommand[] {
  return commands;
}

export function useCommands(): ShellCommand[] {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    () => commands,
    () => commands,
  );
}
