"use client";

import { useSyncExternalStore } from "react";
import { shellStore } from "../lib/store";
import type { WindowState, WinId } from "../lib/types";

// Each hook subscribes to the whole store but reads ONE slice. React bails out
// when the returned snapshot ref is unchanged, so a move on window A only
// re-renders the component reading window A.

export function useWindow(id: WinId): WindowState | undefined {
  return useSyncExternalStore(
    shellStore.subscribe,
    () => shellStore.getWindow(id),
    () => shellStore.getWindow(id),
  );
}

export function useWindowOrder(): WinId[] {
  return useSyncExternalStore(
    shellStore.subscribe,
    shellStore.getOrder,
    shellStore.getOrder,
  );
}

export function useFocused(): WinId | null {
  return useSyncExternalStore(
    shellStore.subscribe,
    shellStore.getFocused,
    shellStore.getFocused,
  );
}

export function useLauncherOpen(): boolean {
  return useSyncExternalStore(
    shellStore.subscribe,
    shellStore.getLauncherOpen,
    shellStore.getLauncherOpen,
  );
}

export function useSpotlightOpen(): boolean {
  return useSyncExternalStore(
    shellStore.subscribe,
    shellStore.getSpotlightOpen,
    shellStore.getSpotlightOpen,
  );
}

export function useInspectorOpen(): boolean {
  return useSyncExternalStore(
    shellStore.subscribe,
    shellStore.getInspectorOpen,
    shellStore.getInspectorOpen,
  );
}

export function useNotificationCenterOpen(): boolean {
  return useSyncExternalStore(
    shellStore.subscribe,
    shellStore.getNotificationCenterOpen,
    shellStore.getNotificationCenterOpen,
  );
}

// The app id of the focused window (or null) — what the Inspector inspects.
export function useFocusedApp(): string | null {
  const focused = useFocused();
  return useWindow(focused ?? "")?.app ?? null;
}
