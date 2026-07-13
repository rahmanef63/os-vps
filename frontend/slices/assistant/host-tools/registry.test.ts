import { describe, expect, it } from "vitest";
import { HOST_TOOLS } from "./catalog";
import { findHostTool, HOST_AI_TOOLS } from "./registry";

// Pure-data test: no React / no shell (the catalog + registry only pull the
// schema helpers + type-only imports, so this runs in the node env).
describe("host-tools registry", () => {
  it("classifies reads as read; fs mutations + exec as mutate", () => {
    const eff = (n: string) => findHostTool(n)?.effect;
    for (const n of ["fs.list", "fs.read", "fs.search", "sys.stats", "apps.list"]) expect(eff(n)).toBe("read");
    for (const n of ["fs.write", "fs.mkdir", "fs.move", "exec.run"]) expect(eff(n)).toBe("mutate");
  });

  it("does NOT expose delete/copy/upload/browser/pty in v1", () => {
    for (const n of ["fs.remove", "fs.delete", "fs.copy", "fs.upload", "browser.act", "pty.open", "apps.start"])
      expect(findHostTool(n)).toBeUndefined();
  });

  it("derives one AiTool per catalog tool with an object input_schema", () => {
    expect(HOST_AI_TOOLS).toHaveLength(HOST_TOOLS.length);
    for (const t of HOST_AI_TOOLS) {
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.input_schema).toMatchObject({ type: "object" });
    }
  });
});
