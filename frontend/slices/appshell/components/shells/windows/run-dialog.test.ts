import { describe, it, expect } from "vitest";
import { resolveApp } from "./run-dialog";
import type { AppDescriptor } from "../../../lib/types";

// resolveApp only reads .id/.title, so minimal fixtures suffice.
const apps = [
  { id: "files-manager", title: "Files" },
  { id: "browser", title: "Browser" },
  { id: "code-editor", title: "Code" },
  { id: "system-monitor", title: "System Monitor" },
] as unknown as AppDescriptor[];

describe("resolveApp", () => {
  it("empty/whitespace query → undefined", () => {
    expect(resolveApp("   ", apps)).toBeUndefined();
    expect(resolveApp("", apps)).toBeUndefined();
  });
  it("no match → undefined", () => {
    expect(resolveApp("nope", apps)).toBeUndefined();
  });
  it("tier 1: exact id, case-insensitive", () => {
    expect(resolveApp("BROWSER", apps)?.id).toBe("browser");
  });
  it("tier 2: exact title when id doesn't match", () => {
    // "files" isn't the id (files-manager) but is the exact title
    expect(resolveApp("files", apps)?.id).toBe("files-manager");
  });
  it("tier 3: title prefix", () => {
    expect(resolveApp("Sys", apps)?.id).toBe("system-monitor");
  });
  it("tier 4: id/title substring", () => {
    expect(resolveApp("manager", apps)?.id).toBe("files-manager");
  });
});
