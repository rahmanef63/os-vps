import { beforeEach, describe, expect, it } from "vitest";
import { moveWindowToSpace, setActiveSpace, spaceOf } from "./spaces";
import { getCommands } from "./commands";
import { closeAll, openWindow, serialize } from "./store";
import { shellStore } from "./store-state";

describe("spaces", () => {
  beforeEach(() => {
    closeAll();
    setActiveSpace(1);
  });

  it("new windows land on the active space; switching refocuses per space", () => {
    const a = openWindow("files", "Files");
    setActiveSpace(2);
    const b = openWindow("docs", "Docs");
    expect(spaceOf(shellStore.getWindow(a))).toBe(1);
    expect(spaceOf(shellStore.getWindow(b))).toBe(2);
    expect(shellStore.getFocused()).toBe(b);

    setActiveSpace(1);
    expect(shellStore.getFocused()).toBe(a);
    setActiveSpace(3);
    expect(shellStore.getFocused()).toBeNull();
  });

  it("moveWindowToSpace reassigns + refocuses, and spaceId persists", () => {
    const a = openWindow("files", "Files");
    moveWindowToSpace(a, 2);
    expect(spaceOf(shellStore.getWindow(a))).toBe(2);
    expect(shellStore.getFocused()).toBeNull(); // active space 1 is now empty
    expect(serialize().find((w) => w.id === a)?.spaceId).toBe(2);
  });

  it("registers switch + move commands", () => {
    const ids = getCommands().map((c) => c.id);
    expect(ids).toContain("space:switch:2");
    expect(ids).toContain("space:move:3");
  });
});
