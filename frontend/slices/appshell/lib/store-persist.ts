import type { WindowState, WinId, PersistedWindow } from "./types";
import { M, emit } from "./store-state";

// Persistence half of the store: snapshot (serialize) + the two restores.
// hydrate REPLACES (profiles / saved layouts = "apply this layout");
// hydrateBoot MERGES (localStorage restore must not wipe a deep-link window
// UrlSync already opened). Split from store.ts for the 200-line rule.

function bumpSeq(persisted: PersistedWindow[]) {
  persisted.forEach((p) => {
    const n = Number(p.id.replace(/\D/g, ""));
    if (n > M.seq) M.seq = n;
  });
}

function commit(windows: Record<WinId, WindowState>, order: WinId[], focused: WinId | null) {
  M.state = {
    ...M.state, // keeps inspectorOpen
    windows,
    order,
    focused,
    activeSpace: 1,
    launcherOpen: false,
    spotlightOpen: false,
    notificationCenterOpen: false,
  };
  emit();
}

/** REPLACE the window set with a persisted layout. Apps re-open lazily. */
export function hydrate(persisted: PersistedWindow[]) {
  bumpSeq(persisted);
  const windows: Record<WinId, WindowState> = {};
  const order: WinId[] = [];
  persisted.forEach((p, i) => {
    windows[p.id] = { ...p, z: i + 1 };
    order.push(p.id);
  });
  commit(windows, order, order[order.length - 1] ?? null);
}

/**
 * Boot-time restore: MERGE the persisted layout UNDER whatever is already open.
 * UrlSync's URL→state effect fires before usePersistLayout's (UrlSync mounts
 * earlier in <AppShell>), so on a deep link a window already exists — a replace
 * here wiped it and the stale layout's focus then rewrote the URL. Rules:
 * live windows keep id/payload/focus and stack on top; a persisted window for
 * the same SINGLE-INSTANCE app as a live one is dropped (the deep link wins —
 * its payload survives); `multiApps` (e.g. Files) restore alongside; persisted
 * ids that collide with live ids are reassigned.
 */
export function hydrateBoot(persisted: PersistedWindow[], multiApps?: ReadonlySet<string>) {
  bumpSeq(persisted); // before remapping, so fresh ids can't collide
  const live = M.state;
  const liveIds = new Set(live.order);
  const liveApps = new Set(live.order.map((id) => live.windows[id].app));
  const windows: Record<WinId, WindowState> = {};
  const order: WinId[] = [];
  persisted.forEach((p) => {
    if (liveApps.has(p.app) && !multiApps?.has(p.app)) return;
    const id = liveIds.has(p.id) ? `w${++M.seq}` : p.id;
    windows[id] = { ...p, id, z: order.length + 1 };
    order.push(id);
  });
  live.order.forEach((id) => {
    windows[id] = { ...live.windows[id], z: order.length + 1 };
    order.push(id);
  });
  commit(windows, order, live.focused ?? order[order.length - 1] ?? null);
}

/** Snapshot for persistence — strips volatile z/focus. */
export function serialize(): PersistedWindow[] {
  return M.state.order.map((id) => {
    const { z: _z, ...rest } = M.state.windows[id];
    return rest;
  });
}
