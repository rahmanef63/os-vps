import { describe, expect, it } from "vitest";
import { editorFor, fmtTime } from "./media";

describe("editorFor", () => {
  it("returns media-studio for image kind", () => {
    expect(editorFor("image")).toEqual({ app: "media-studio", label: "Image Editor" });
  });

  it("returns reel-editor for video kind", () => {
    expect(editorFor("video")).toEqual({ app: "reel-editor", label: "Video Editor" });
  });

  it("returns reel-editor for audio kind", () => {
    expect(editorFor("audio")).toEqual({ app: "reel-editor", label: "Video Editor" });
  });

  it("returns null for pdf kind", () => {
    expect(editorFor("pdf")).toBeNull();
  });

  it("returns null for text kind", () => {
    expect(editorFor("text")).toBeNull();
  });
});

describe("fmtTime", () => {
  it("formats 0 seconds as '0:00'", () => {
    expect(fmtTime(0)).toBe("0:00");
  });

  it("formats 59 seconds as '0:59'", () => {
    expect(fmtTime(59)).toBe("0:59");
  });

  it("formats 60 seconds as '1:00'", () => {
    expect(fmtTime(60)).toBe("1:00");
  });

  it("formats 3661 seconds as '61:01'", () => {
    expect(fmtTime(3661)).toBe("61:01");
  });

  it("rounds fractional seconds (0.4 → 0)", () => {
    expect(fmtTime(0.4)).toBe("0:00");
  });

  it("rounds fractional seconds (0.5 → 1)", () => {
    expect(fmtTime(0.5)).toBe("0:01");
  });

  it("rounds fractional seconds (59.6 → 60 → '1:00')", () => {
    expect(fmtTime(59.6)).toBe("1:00");
  });

  it("clamps negative values to '0:00'", () => {
    expect(fmtTime(-5)).toBe("0:00");
  });

  it("pads single-digit seconds with leading zero", () => {
    expect(fmtTime(65)).toBe("1:05");
  });
});
