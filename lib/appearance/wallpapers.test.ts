import { describe, expect, it } from "vitest";
import { LIVE_WALLPAPER_HTML_MAX, normalizeLiveWallpaper, normalizeWallpaper } from "./wallpapers";

describe("normalizeWallpaper", () => {
  it("keeps valid keys and coerces legacy/garbage to auto", () => {
    expect(normalizeWallpaper("ios")).toBe("ios");
    expect(normalizeWallpaper("dusk")).toBe("auto"); // removed legacy preset
    expect(normalizeWallpaper(42)).toBe("auto");
  });
});

describe("normalizeLiveWallpaper", () => {
  it("accepts a component selection and normalizes interactive to boolean", () => {
    expect(normalizeLiveWallpaper({ kind: "component", id: "starfield", interactive: 1 })).toEqual({
      kind: "component",
      id: "starfield",
      interactive: false, // truthy-but-not-true coerces off (strict === true)
    });
    expect(normalizeLiveWallpaper({ kind: "component", id: "drift", interactive: true })).toEqual({
      kind: "component",
      id: "drift",
      interactive: true,
    });
  });

  it("accepts bounded HTML and rejects empty/oversized/malformed values", () => {
    expect(normalizeLiveWallpaper({ kind: "html", html: "<h1>hi</h1>" })).toEqual({
      kind: "html",
      html: "<h1>hi</h1>",
      interactive: false,
    });
    expect(normalizeLiveWallpaper({ kind: "html", html: "   " })).toBeNull();
    expect(normalizeLiveWallpaper({ kind: "html", html: "x".repeat(LIVE_WALLPAPER_HTML_MAX + 1) })).toBeNull();
    expect(normalizeLiveWallpaper({ kind: "component", id: "" })).toBeNull();
    expect(normalizeLiveWallpaper("starfield")).toBeNull();
    expect(normalizeLiveWallpaper(null)).toBeNull();
  });
});
