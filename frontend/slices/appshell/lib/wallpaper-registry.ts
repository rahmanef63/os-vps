"use client";
/* Live-wallpaper registry. A "live" wallpaper is a React component defined in
   CODE (a TSX animation, clock, canvas field …) registered here and surfaced in
   the wallpaper picker. This is the TRUSTED path — these ship in the bundle and
   render inline. The OTHER live path is user-pasted HTML, which renders in a
   sandboxed iframe (see components/wallpaper.tsx) and never touches this
   registry. Selecting a wallpaper persists only its `id` (or the HTML), so the
   appearance store stays small + serialisable. */
import { useSyncExternalStore, type ComponentType } from "react";

/** Props every live-wallpaper component receives. `interactive` is true when the
 *  user has enabled click-through so the wallpaper can react to pointer events. */
export type WallpaperProps = { interactive?: boolean };

export type WallpaperDescriptor = {
  id: string;
  label: string;
  /** The component painted full-bleed behind the shell. */
  render: ComponentType<WallpaperProps>;
  /** Default interactivity hint (the user can still override per selection). */
  interactive?: boolean;
};

const registry = new Map<string, WallpaperDescriptor>();
const subs = new Set<() => void>();
let snapshot: WallpaperDescriptor[] = [];

function recompute() {
  snapshot = [...registry.values()];
  subs.forEach((f) => f());
}

/** Register a code-defined live wallpaper. Returns an unregister fn. */
export function registerWallpaper(d: WallpaperDescriptor): () => void {
  registry.set(d.id, d);
  recompute();
  return () => {
    registry.delete(d.id);
    recompute();
  };
}

export function getWallpaper(id: string): WallpaperDescriptor | undefined {
  return registry.get(id);
}

export function listWallpapers(): WallpaperDescriptor[] {
  return snapshot;
}

/** Reactive list for the picker (re-renders when registrations change). */
export function useWallpapers(): WallpaperDescriptor[] {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => snapshot,
    () => snapshot,
  );
}
