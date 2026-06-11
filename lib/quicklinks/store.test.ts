import { describe, expect, it } from "vitest";
import { normalizeUrl, sanitizeQuicklinks, titleFromUrl } from "./store";

describe("normalizeUrl", () => {
  it("prefixes https:// for bare hosts and trims", () => {
    expect(normalizeUrl(" example.com ")).toBe("https://example.com");
  });
  it("leaves an existing scheme untouched", () => {
    expect(normalizeUrl("http://x.dev")).toBe("http://x.dev");
  });
  it("returns empty for blank input", () => {
    expect(normalizeUrl("   ")).toBe("");
  });
});

describe("titleFromUrl", () => {
  it("strips www and returns the hostname", () => {
    expect(titleFromUrl("https://www.github.com/x")).toBe("github.com");
  });
  it("returns the raw string when not a URL", () => {
    expect(titleFromUrl("not a url")).toBe("not a url");
  });
});

describe("sanitizeQuicklinks", () => {
  const ok = { id: "gh", title: "GitHub", url: "https://github.com" };

  it("drops non-array input", () => {
    expect(sanitizeQuicklinks(null)).toEqual([]);
    expect(sanitizeQuicklinks({ id: "x" })).toEqual([]);
    expect(sanitizeQuicklinks("nope")).toEqual([]);
  });

  it("keeps valid rows and drops malformed ones silently", () => {
    const input = [
      ok,
      null,
      { id: "y", title: "Y" }, // missing url
      { id: 1, title: "n", url: "https://n.com" }, // id not a string
      "string-row",
      { id: "z", title: "Z", url: "https://z.com" },
    ];
    expect(sanitizeQuicklinks(input)).toEqual([ok, { id: "z", title: "Z", url: "https://z.com" }]);
  });

  it("returns [] when every row is invalid (no crash)", () => {
    expect(sanitizeQuicklinks([null, undefined, 42, {}])).toEqual([]);
  });
});
