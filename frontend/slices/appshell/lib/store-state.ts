import type { ShellState, WindowState, WinId } from "./types";

// Module-level external store, held in a mutable `M` object (not a rebindable
// `let`) so the action functions in store.ts can mutate ONE shared instance
// across files. The hot path (drag/resize) replaces ONE window object and
// notifies; React bails out on every window whose snapshot ref is unchanged
// (Object.is), so only the moved window re-renders — 60fps with 24 panes.

type Listener = () => void;

export const M = {
  state: {
    windows: {},
    order: [],
    focused: null,
    activeSpace: 1,
    launcherOpen: false,
    spotlightOpen: false,
    inspectorOpen: false,
    notificationCenterOpen: false,
  } as ShellState,
  seq: 0,
};

const listeners = new Set<Listener>();

export function emit() {
  listeners.forEach((l) => l());
}

export const shellStore = {
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getWindow(id: WinId): WindowState | undefined {
    return M.state.windows[id];
  },
  getOrder(): WinId[] {
    return M.state.order;
  },
  getFocused(): WinId | null {
    return M.state.focused;
  },
  getLauncherOpen(): boolean {
    return M.state.launcherOpen;
  },
  getSpotlightOpen(): boolean {
    return M.state.spotlightOpen;
  },
  getInspectorOpen(): boolean {
    return M.state.inspectorOpen;
  },
  getNotificationCenterOpen(): boolean {
    return M.state.notificationCenterOpen;
  },
  getActiveSpace(): number {
    return M.state.activeSpace;
  },
};

export function topZ(): number {
  return M.state.order.reduce((m, id) => Math.max(m, M.state.windows[id]?.z ?? 0), 0);
}

export function patch(id: WinId, p: Partial<WindowState>) {
  const win = M.state.windows[id];
  if (!win) return;
  M.state = { ...M.state, windows: { ...M.state.windows, [id]: { ...win, ...p } } };
  emit();
}
