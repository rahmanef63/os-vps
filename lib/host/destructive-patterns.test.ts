import { describe, expect, it } from "vitest";
import { matchDestructive } from "./destructive-patterns";

describe("matchDestructive", () => {
  it("flags box-wrecking commands", () => {
    expect(matchDestructive("rm -rf /")).toBeTruthy();
    expect(matchDestructive("sudo shutdown now")).toBeTruthy();
    expect(matchDestructive("systemctl stop os-vps")).toBeTruthy();
    expect(matchDestructive("mkfs.ext4 /dev/sda")).toBeTruthy();
    expect(matchDestructive("kill -9 1")).toBeTruthy();
  });

  it("allows ordinary commands", () => {
    expect(matchDestructive("ls -la ~/projects")).toBeNull();
    expect(matchDestructive("git status")).toBeNull();
    expect(matchDestructive("npm run build")).toBeNull();
    // The load-bearing case: deleting the OWNER's data inside a write root is NOT
    // on the denylist — the human approval gate is what protects it, not this.
    expect(matchDestructive("rm -rf ~/projects/scratch")).toBeNull();
  });
});
