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

  it("keeps an edited core (laptop) target through ensureServerTargets", () => {
    const edited: ServerConfig = {
      ...TWEAK_DEFAULTS.server,
      targets: [
        { id: "mock", kind: "mock", label: "Mock" },
        { id: "vps", kind: "local", label: "This VPS", url: "" },
        { id: "laptop", kind: "ssh", label: "Laptop", host: "100.64.0.5", user: "rahman", port: 2222 },
      ],
    };

    const ensured = ensureServerTargets(edited);
    const laptop = ensured.targets.find((t) => t.id === "laptop");

    // Saved edits win over pristine CORE_TARGETS (no revert), shape unchanged.
    expect(laptop).toEqual({ id: "laptop", kind: "ssh", label: "Laptop", host: "100.64.0.5", user: "rahman", port: 2222 });
    expect(ensured.targets.map((t) => t.id)).toEqual(["mock", "vps", "laptop"]);
  });

  it("appends only missing core targets, preserving saved order", () => {
    const partial: ServerConfig = {
      mode: "live",
      url: "",
      activeTargetId: "vps",
      targets: [{ id: "vps", kind: "local", label: "This VPS", url: "" }],
    };

    const ids = ensureServerTargets(partial).targets.map((t) => t.id);

    // Saved vps stays first; missing mock + laptop are appended after.
    expect(ids).toEqual(["vps", "mock", "laptop"]);
  });

  it("adds a new SSH target with safe blank connection fields", () => {
    const next = addSshTarget(TWEAK_DEFAULTS.server);
    const added = next.targets.find((t) => t.id !== "mock" && t.id !== "vps" && t.id !== "laptop");

    expect(added).toMatchObject({ kind: "ssh", label: "SSH Host", host: "", user: "", port: 22 });
    expect(next.activeTargetId).toBe(added?.id);
  });
});
