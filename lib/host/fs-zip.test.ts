import { describe, expect, it } from "vitest";
import { assertSafeName } from "./fs-zip";

describe("assertSafeName", () => {
  it("accepts a plain basename", () => {
    expect(() => assertSafeName("report.pdf")).not.toThrow();
    expect(() => assertSafeName(".hidden")).not.toThrow();
    expect(() => assertSafeName("a folder")).not.toThrow();
  });

  it("rejects traversal, separators and NUL", () => {
    for (const bad of ["", ".", "..", "../etc/passwd", "a/b", "a\\b", "x\0y", "/abs"])
      expect(() => assertSafeName(bad)).toThrow();
  });
});
