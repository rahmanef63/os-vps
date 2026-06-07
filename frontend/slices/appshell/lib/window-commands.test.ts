import { beforeEach, describe, expect, it, vi } from "vitest";
import { TILE_PRESETS, togglePin } from "./window-commands";
import { getCommands } from "./commands";
import { closeAll, openWindow, serialize, snapWindow } from "./store";
import { shellStore } from "./store-state";
import { snapRect } from "./store-geometry";

// snapRect reads window.innerWidth/Height — stub a 1280x800 viewport.
vi.stubGlobal("window", Object.assign(globalThis.window ?? {}, { innerWidth: 1280, innerHeight: 800 }));

describe("pin (always-on-top)", () => {
  beforeEach(() => closeAll());

  it("toggles and persists through serialize()", () => {
    const id = openWindow("files", "Files");
    togglePin(id);
    expect(shellStore.getWindow(id)?.pinned).toBe(true);
    expect(serialize().find((w) => w.id === id)?.pinned).toBe(true);
    togglePin(id);
    expect(shellStore.getWindow(id)?.pinned).toBe(false);
  });
});

describe("tiling presets", () => {
  beforeEach(() => closeAll());

  it("registers a palette command per preset", () => {
    const ids = getCommands().map((c) => c.id);
    for (const p of TILE_PRESETS) expect(ids).toContain(`window:tile:${p.zone}`);
    expect(ids).toContain("window:pin");
  });

  it("thirds partition the work area exactly", () => {
    const l13 = snapRect("l13");
    const r23 = snapRect("r23");
    const l23 = snapRect("l23");
    const r13 = snapRect("r13");
    // ⅓ + gutter + ⅔ spans the same width as ⅔ + gutter + ⅓
    expect(l13.w + r23.w).toBeCloseTo(l23.w + r13.w, 5);
    expect(r23.x).toBeCloseTo(l13.x + l13.w + 8, 5); // GAP gutter
    expect(l23.w).toBeCloseTo(l13.w * 2, 5);
  });

  it("snapWindow applies a preset zone + records it", () => {
    const id = openWindow("files", "Files");
    snapWindow(id, "l23");
    const win = shellStore.getWindow(id)!;
    expect(win.snapZone).toBe("l23");
    expect(win.w).toBeCloseTo(snapRect("l23").w, 5);
  });
});
