import path from "path";
import { realpathSync } from "fs";
import { describe, expect, it } from "vitest";
import { appSecretExcludes, assertSafeName } from "./fs-zip";

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

describe("appSecretExcludes", () => {
  // appDir() = realpath(cwd) = the repo root during the test run.
  const appDir = realpathSync(process.cwd());
  const appName = path.basename(appDir);

  it("strips the app's .env* when a PARENT is the archive base", () => {
    // The exploit: zip ~/projects (parent) with os-vps nested inside.
    expect(appSecretExcludes(path.dirname(appDir))).toEqual([
      `${appName}/.env`,
      `${appName}/.env.*`,
    ]);
  });

  it("no-ops when base is the app dir itself or unrelated to it", () => {
    expect(appSecretExcludes(appDir)).toEqual([]);
    expect(appSecretExcludes("/some/unrelated/dir")).toEqual([]);
  });
});
