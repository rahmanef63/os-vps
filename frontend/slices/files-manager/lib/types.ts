import type { FsEntry } from "@/lib/os-api";

export type ViewMode = "grid" | "list";
export type SortKey = "name" | "size" | "kind";

// Pending clipboard op. `from` is the source directory the names live in.
export type Clipboard = {
  mode: "copy" | "cut";
  names: string[];
  from: string;
};

// Right-click target. `entry` null === empty-canvas menu.
export type ContextState = {
  x: number;
  y: number;
  entry: FsEntry | null;
};

// Sort entries: dirs first, then by key. Pure — safe to memoize on.
export function sortEntries(entries: FsEntry[], key: SortKey): FsEntry[] {
  return [...entries].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
    if (key === "size") return b.size - a.size;
    if (key === "kind") return (a.ext ?? "").localeCompare(b.ext ?? "");
    return a.name.localeCompare(b.name);
  });
}
