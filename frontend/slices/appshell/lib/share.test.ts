import { describe, expect, it } from "vitest";
import { registerShareTarget, share, targetsFor } from "./share";

describe("share targets", () => {
  it("ships generic built-ins for any payload", () => {
    const ids = targetsFor({ a: 1 }).map((t) => t.id);
    expect(ids).toContain("copy-text");
    expect(ids).toContain("download-file");
  });

  it("consumer targets rank first and filter by canShare", () => {
    const off = registerShareTarget({
      id: "notion",
      label: "Send to Notion",
      canShare: (p) => typeof p === "object",
      run: () => {},
    });
    expect(targetsFor({}).map((t) => t.id)[0]).toBe("notion");
    expect(targetsFor("text").map((t) => t.id)).not.toContain("notion");
    off();
    expect(targetsFor({}).map((t) => t.id)).not.toContain("notion");
  });

  it("share() refuses payloads nothing can take", () => {
    expect(share(null)).toBe(false);
    expect(share("ok")).toBe(true);
  });
});
