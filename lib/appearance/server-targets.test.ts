import { describe, expect, it } from "vitest";
import { addSshTarget, effectiveServerTarget, ensureServerTargets } from "./server-targets";
import { TWEAK_DEFAULTS, type ServerConfig } from "./types";

describe("server target helpers", () => {
  it("migrates the legacy mock/live toggle into tab targets without secrets", () => {
    const legacy: ServerConfig = { mode: "live", url: "https://os.example.com" };

    const migrated = ensureServerTargets(legacy);

    expect(migrated.activeTargetId).toBe("vps");
    expect(migrated.targets).toEqual([
      { id: "mock", kind: "mock", label: "Mock" },
      { id: "vps", kind: "local", label: "This VPS", url: "https://os.example.com" },
      { id: "laptop", kind: "ssh", label: "Laptop", host: "", user: "", port: 22 },
    ]);
    expect(JSON.stringify(migrated)).not.toMatch(/password|secret|privateKey/i);
  });

  it("falls back to mock when demo mode or an unknown active target is requested", () => {
    expect(effectiveServerTarget({ ...TWEAK_DEFAULTS.server, activeTargetId: "missing" })?.id).toBe("mock");
    expect(effectiveServerTarget({ ...TWEAK_DEFAULTS.server, activeTargetId: "laptop" }, true)?.id).toBe("mock");
  });

  it("adds a new SSH target with safe blank connection fields", () => {
    const next = addSshTarget(TWEAK_DEFAULTS.server);
    const added = next.targets.find((t) => t.id !== "mock" && t.id !== "vps" && t.id !== "laptop");

    expect(added).toMatchObject({ kind: "ssh", label: "SSH Host", host: "", user: "", port: 22 });
    expect(next.activeTargetId).toBe(added?.id);
  });
});
