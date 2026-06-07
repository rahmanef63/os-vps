import { beforeEach, describe, expect, it } from "vitest";
import { clearClips, listClips, recordClip, removeClip, togglePinClip } from "./clipboard";
import { getCommands } from "./commands";

function reset() {
  listClips().forEach((c) => removeClip(c.id));
}

describe("clipboard history", () => {
  beforeEach(reset);

  it("records newest-first, dedupes the top, ignores empties", () => {
    recordClip("one");
    recordClip("one"); // dup of top — ignored
    recordClip("  "); // empty — ignored
    recordClip("two");
    expect(listClips().map((c) => c.text)).toEqual(["two", "one"]);
  });

  it("pinned entries survive clearClips", () => {
    recordClip("keep");
    recordClip("drop");
    togglePinClip(listClips().find((c) => c.text === "keep")!.id);
    clearClips();
    expect(listClips().map((c) => c.text)).toEqual(["keep"]);
  });

  it("registers the palette command", () => {
    expect(getCommands().map((c) => c.id)).toContain("clipboard:history");
  });
});
