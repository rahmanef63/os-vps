import { beforeEach, describe, expect, it } from "vitest";
import { deleteLayout, listLayouts, restoreLayout, saveLayout } from "./layouts";
import { getCommands } from "./commands";
import { closeAll, openWindow, serialize } from "./store";

describe("saved layouts", () => {
  beforeEach(() => {
    closeAll();
    listLayouts().forEach(deleteLayout);
  });

  it("saves, restores, and deletes a named snapshot", () => {
    openWindow("files", "Files", { w: 600, h: 400 });
    openWindow("docs", "Docs");
    const name = saveLayout();
    expect(name).toBe("Layout 1");
    expect(listLayouts()).toEqual(["Layout 1"]);

    closeAll();
    expect(serialize()).toHaveLength(0);

    expect(restoreLayout(name)).toBe(true);
    const restored = serialize();
    expect(restored.map((w) => w.app).sort()).toEqual(["docs", "files"]);
    expect(restored.find((w) => w.app === "files")).toMatchObject({ w: 600, h: 400 });

    deleteLayout(name);
    expect(listLayouts()).toEqual([]);
    expect(restoreLayout(name)).toBe(false);
  });

  it("registers palette commands per layout", () => {
    openWindow("files", "Files");
    saveLayout("Work");
    const ids = getCommands().map((c) => c.id);
    expect(ids).toContain("layout:save");
    expect(ids).toContain("layout:restore:Work");
    expect(ids).toContain("layout:delete:Work");
    deleteLayout("Work");
    expect(getCommands().map((c) => c.id)).not.toContain("layout:restore:Work");
  });
});
