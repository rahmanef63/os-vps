import { describe, it, expect } from "vitest";
import { parseImage, isCssImage, isUrlImage } from "./parseImage";
import type { ImageValue } from "../types";

describe("parseImage", () => {
  it("returns null for null", () => {
    expect(parseImage(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseImage(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseImage("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseImage("   ")).toBeNull();
  });

  it("passes through an ImageValue object unchanged", () => {
    const obj: ImageValue = { type: "color", value: "red", positionY: 50 };
    expect(parseImage(obj)).toBe(obj);
  });

  it("passes through an upload ImageValue object", () => {
    const obj: ImageValue = { type: "upload", value: "storage:abc123", positionY: 30 };
    expect(parseImage(obj)).toBe(obj);
  });

  it("detects linear-gradient", () => {
    const result = parseImage("linear-gradient(to right, #000, #fff)");
    expect(result).toEqual({
      type: "gradient",
      value: "linear-gradient(to right, #000, #fff)",
      positionY: 50,
    });
  });

  it("detects radial-gradient", () => {
    const result = parseImage("radial-gradient(circle, red, blue)");
    expect(result).toEqual({
      type: "gradient",
      value: "radial-gradient(circle, red, blue)",
      positionY: 50,
    });
  });

  it("detects conic-gradient", () => {
    const result = parseImage("conic-gradient(red, blue)");
    expect(result).toEqual({
      type: "gradient",
      value: "conic-gradient(red, blue)",
      positionY: 50,
    });
  });

  it("detects gradient with leading whitespace", () => {
    const result = parseImage("  linear-gradient(#000, #fff)");
    expect(result?.type).toBe("gradient");
  });

  it("detects 3-digit hex color (#abc)", () => {
    const result = parseImage("#abc");
    expect(result).toEqual({ type: "color", value: "#abc", positionY: 50 });
  });

  it("detects 6-digit hex color (#rrggbb)", () => {
    const result = parseImage("#ff0000");
    expect(result).toEqual({ type: "color", value: "#ff0000", positionY: 50 });
  });

  it("detects 8-digit hex color with alpha (#rrggbbaa)", () => {
    const result = parseImage("#ff000080");
    expect(result).toEqual({ type: "color", value: "#ff000080", positionY: 50 });
  });

  it("detects rgb() color", () => {
    const result = parseImage("rgb(255, 0, 0)");
    expect(result).toEqual({ type: "color", value: "rgb(255, 0, 0)", positionY: 50 });
  });

  it("detects rgba() color", () => {
    const result = parseImage("rgba(0, 128, 255, 0.5)");
    expect(result?.type).toBe("color");
    expect(result?.value).toBe("rgba(0, 128, 255, 0.5)");
  });

  it("detects hsl() color", () => {
    const result = parseImage("hsl(120, 100%, 50%)");
    expect(result?.type).toBe("color");
  });

  it("detects hsla() color", () => {
    const result = parseImage("hsla(240, 100%, 50%, 0.3)");
    expect(result?.type).toBe("color");
  });

  it("detects named color: red", () => {
    expect(parseImage("red")?.type).toBe("color");
  });

  it("detects named color: blue", () => {
    expect(parseImage("blue")?.type).toBe("color");
  });

  it("detects named color: green", () => {
    expect(parseImage("green")?.type).toBe("color");
  });

  it("detects named color case-insensitively", () => {
    expect(parseImage("RED")?.type).toBe("color");
  });

  it("detects https URL → link", () => {
    const result = parseImage("https://example.com/photo.jpg");
    expect(result).toEqual({
      type: "link",
      value: "https://example.com/photo.jpg",
      positionY: 50,
    });
  });

  it("detects http URL → link", () => {
    const result = parseImage("http://example.com/photo.jpg");
    expect(result?.type).toBe("link");
  });

  it("detects storage: URL → link", () => {
    const result = parseImage("storage:abc123");
    expect(result).toEqual({
      type: "link",
      value: "storage:abc123",
      positionY: 50,
    });
  });

  it("falls back to color for unknown string", () => {
    const result = parseImage("completely-unknown-value");
    expect(result).toEqual({
      type: "color",
      value: "completely-unknown-value",
      positionY: 50,
    });
  });
});

describe("isCssImage", () => {
  it("returns true for color type", () => {
    expect(isCssImage({ type: "color", value: "red" })).toBe(true);
  });

  it("returns true for gradient type", () => {
    expect(isCssImage({ type: "gradient", value: "linear-gradient(#000,#fff)" })).toBe(true);
  });

  it("returns false for link type", () => {
    expect(isCssImage({ type: "link", value: "https://example.com/img.jpg" })).toBe(false);
  });

  it("returns false for upload type", () => {
    expect(isCssImage({ type: "upload", value: "storage:abc" })).toBe(false);
  });

  it("returns false for unsplash type", () => {
    expect(isCssImage({ type: "unsplash", value: "https://unsplash.com/photo" })).toBe(false);
  });
});

describe("isUrlImage", () => {
  it("returns false for color type", () => {
    expect(isUrlImage({ type: "color", value: "blue" })).toBe(false);
  });

  it("returns false for gradient type", () => {
    expect(isUrlImage({ type: "gradient", value: "linear-gradient(#000,#fff)" })).toBe(false);
  });

  it("returns true for link type", () => {
    expect(isUrlImage({ type: "link", value: "https://example.com/img.jpg" })).toBe(true);
  });

  it("returns true for upload type", () => {
    expect(isUrlImage({ type: "upload", value: "storage:abc" })).toBe(true);
  });

  it("returns true for texture type", () => {
    expect(isUrlImage({ type: "texture", value: "https://example.com/tex.png" })).toBe(true);
  });
});
