"use client";

import { useSyncExternalStore } from "react";
import { M, emit, patch, shellStore } from "./store-state";
import { registerCommands } from "./commands";
import { focusWindow } from "./store";
import { spaceOf } from "./spaces";
import { toast } from "./toast";
import type { WinId } from "./types";

// Window tabs — merge an app's windows into ONE tabbed frame. Members share a
// groupId; the ACTIVE member is the group's top-z window (focus = activate),
// the only one that renders. The frame shows a tab strip (components/
// window-tabs.tsx); activating a tab hands it the current frame rect so the
// group reads as one window. "Separate tabs" cascades members back out.

/** Group members in window order (minimized ones included — they keep tabs). */
export function groupMembers(groupId: string): WinId[] {
  return M.state.order.filter((id) => M.state.windows[id]?.groupId === groupId);
}

/** The member that renders for the group (highest z, not minimized). */
export function groupTop(groupId: string): WinId | null {
  let best: WinId | null = null;
  let bestZ = -1;
  for (const id of groupMembers(groupId)) {
    const w = M.state.windows[id];
    if (!w || w.minimized) continue;
    if (w.z > bestZ) {
      bestZ = w.z;
      best = id;
    }
  }
  return best;
}

export function useGroupTop(groupId: string | undefined): WinId | null {
  return useSyncExternalStore(
    shellStore.subscribe,
    () => (groupId ? groupTop(groupId) : null),
    () => (groupId ? groupTop(groupId) : null),
  );
}

/** Tab click: hand the member the live frame rect, then bring it on top. */
export function activateTab(id: WinId, frameOf: WinId): void {
  const frame = M.state.windows[frameOf];
  if (!frame) return;
  patch(id, { x: frame.x, y: frame.y, w: frame.w, h: frame.h, minimized: false });
  focusWindow(id);
}

/** Merge the focused app's windows (current space) into one tabbed frame. */
export function mergeFocusedAppWindows(): number {
  const fid = M.state.focused;
  const focused = fid ? M.state.windows[fid] : undefined;
  if (!fid || !focused) return 0;
  const members = M.state.order.filter((id) => {
    const w = M.state.windows[id];
    return w && w.app === focused.app && spaceOf(w) === spaceOf(focused);
  });
  if (members.length < 2) return 0;
  for (const id of members) {
    patch(id, {
      groupId: fid,
      x: focused.x,
      y: focused.y,
      w: focused.w,
      h: focused.h,
      minimized: false,
    });
  }
  focusWindow(fid);
  return members.length;
}

/** Dissolve the group, cascading members so they're all visible again. */
export function ungroup(groupId: string): void {
  groupMembers(groupId).forEach((id, i) => {
    const w = M.state.windows[id];
    if (!w) return;
    patch(id, { groupId: undefined, x: w.x + i * 28, y: w.y + i * 28 });
  });
  emit();
}

registerCommands("window-tabs", [
  {
    id: "tabs:merge",
    label: "Merge windows into tabs",
    hint: "Window",
    keywords: "group stack combine app",
    run: () => {
      const n = mergeFocusedAppWindows();
      toast(n >= 2 ? `Merged ${n} windows into tabs` : "Need 2+ windows of the same app");
    },
  },
  {
    id: "tabs:separate",
    label: "Separate tabs",
    hint: "Window",
    keywords: "ungroup unstack split windows",
    run: () => {
      const fid = M.state.focused;
      const g = fid ? M.state.windows[fid]?.groupId : undefined;
      if (!g) {
        toast("Focused window has no tabs");
        return;
      }
      ungroup(g);
      toast("Separated tabs");
    },
  },
]);
