import { describe, expect, it } from "vitest";
import { CLEANUP_CATEGORIES, parseHuman, runCleanup } from "./cleanup";

describe("parseHuman", () => {
  it("parses docker/du human sizes to bytes", () => {
    expect(parseHuman("1.5GB")).toBe(1_500_000_000);
    expect(parseHuman("512 MB")).toBe(512_000_000);
    expect(parseHuman("3.9G")).toBe(3_900_000_000);
    expect(parseHuman("120kB (5%)")).toBe(120_000);
    expect(parseHuman("0B")).toBe(0);
    expect(parseHuman("garbage")).toBe(0);
  });
});

describe("cleanup allowlist", () => {
  it("unknown ids are reported, never executed", async () => {
    const results = await runCleanup(["definitely-not-a-category"]);
    expect(results).toEqual([
      { id: "definitely-not-a-category", ok: false, freedBytes: 0, error: "unknown category" },
    ]);
  });

  it("category ids are unique", () => {
    const ids = CLEANUP_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
