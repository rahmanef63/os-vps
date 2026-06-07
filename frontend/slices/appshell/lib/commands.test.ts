import { describe, expect, it } from "vitest";
import { getCommands, registerCommands } from "./commands";

const cmd = (id: string) => ({ id, label: id, run: () => {} });

describe("command registry", () => {
  it("registers, replaces per source, and unregisters", () => {
    const off = registerCommands("t1", [cmd("a"), cmd("b")]);
    expect(getCommands().map((c) => c.id)).toContain("a");

    // Re-register under the same source replaces, never stacks.
    registerCommands("t1", [cmd("c")]);
    const ids = getCommands().map((c) => c.id);
    expect(ids).toContain("c");
    expect(ids).not.toContain("a");

    // Stale unregister fn (from the replaced set) is a no-op.
    off();
    expect(getCommands().map((c) => c.id)).toContain("c");

    registerCommands("t1", [])();
  });

  it("keeps sources independent", () => {
    const offA = registerCommands("srcA", [cmd("a1")]);
    const offB = registerCommands("srcB", [cmd("b1")]);
    offA();
    const ids = getCommands().map((c) => c.id);
    expect(ids).not.toContain("a1");
    expect(ids).toContain("b1");
    offB();
  });
});
