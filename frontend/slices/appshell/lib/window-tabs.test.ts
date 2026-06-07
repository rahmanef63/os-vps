import { beforeEach, describe, expect, it } from "vitest";
import { activateTab, groupMembers, groupTop, mergeFocusedAppWindows, ungroup } from "./window-tabs";
import { closeAll, closeWindow, focusWindow, openWindow } from "./store";
import { setActiveSpace } from "./spaces";
import { shellStore } from "./store-state";

describe("window tabs", () => {
  beforeEach(() => {
    closeAll();
    setActiveSpace(1);
  });

  it("merges the focused app's windows; members share the leader's rect", () => {
    const a = openWindow("files", "Files", { w: 600, h: 400 }, undefined, { multi: true });
    const b = openWindow("files", "Files", { w: 500, h: 300 }, undefined, { multi: true });
    openWindow("docs", "Docs"); // other app — must stay out
    focusWindow(a);
    expect(mergeFocusedAppWindows()).toBe(2);

    const members = groupMembers(a);
    expect(members.sort()).toEqual([a, b].sort());
    expect(shellStore.getWindow(b)?.w).toBe(shellStore.getWindow(a)?.w);
    expect(groupTop(a)).toBe(a); // focused leader on top
  });

  it("activateTab hands over the frame rect; close falls to the next member", () => {
    const a = openWindow("files", "Files", undefined, undefined, { multi: true });
    const b = openWindow("files", "Files", undefined, undefined, { multi: true });
    focusWindow(a);
    mergeFocusedAppWindows();

    activateTab(b, a);
    expect(groupTop(a)).toBe(b);
    expect(shellStore.getWindow(b)?.x).toBe(shellStore.getWindow(a)?.x);

    closeWindow(b);
    expect(groupTop(a)).toBe(a);
  });

  it("ungroup clears groupId and cascades members", () => {
    const a = openWindow("files", "Files", undefined, undefined, { multi: true });
    openWindow("files", "Files", undefined, undefined, { multi: true });
    focusWindow(a);
    mergeFocusedAppWindows();
    const x0 = shellStore.getWindow(a)!.x;

    ungroup(a);
    expect(groupMembers(a)).toEqual([]);
    const xs = shellStore.getOrder().map((id) => shellStore.getWindow(id)!.x);
    expect(new Set(xs).size).toBeGreaterThan(1); // cascaded apart
    expect(shellStore.getWindow(a)!.x).toBe(x0);
  });
});
