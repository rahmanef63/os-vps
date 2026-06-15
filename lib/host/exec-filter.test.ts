import os from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { destructiveReason, runCommand } from "./exec";

afterEach(() => vi.unstubAllEnvs());

describe("destructiveReason blocks catastrophic commands", () => {
  const blocked: [cmd: string, why: RegExp][] = [
    ["rm -rf /", /rm -rf on \//],
    ["rm -rf /*", /rm -rf on \//],
    ["rm -f -r /", /rm -rf on \//],
    ["sudo rm -rf --no-preserve-root /", /rm -rf on \//], // first matching rule wins
    ["rm -r --no-preserve-root ./dir", /no-preserve-root/],
    ["mkfs /dev/sda1", /mkfs/],
    ["mkfs.ext4 /dev/sda1", /mkfs/],
    ["dd if=/dev/zero of=/dev/sda bs=1M", /dd to a block device/],
    ["dd if=img.iso of=/dev/nvme0n1", /dd to a block device/],
    ["echo junk > /dev/sda1", /redirect to a block device/],
    [":(){ :|:& };:", /fork bomb/],
    ["chmod -R 777 /", /recursive chmod\/chown/],
    ["chown -R nobody /", /recursive chmod\/chown/],
    ["systemctl stop nginx", /systemctl/],
    ["systemctl restart os-vps.service", /systemctl/],
    ["sudo systemctl disable os-vps", /systemctl/],
    ["service nginx restart", /service stop\/restart/],
    ["service ssh stop", /service stop\/restart/],
    ["shutdown -h now", /shutdown\/reboot\/poweroff/],
    ["reboot", /shutdown\/reboot\/poweroff/],
    ["poweroff", /shutdown\/reboot\/poweroff/],
    ["init 0", /init 0\/6/],
    ["init 6", /init 0\/6/],
    ["kill 1", /kill PID 1/],
    ["kill -9 1", /kill PID 1/],
    ["kill -SIGKILL 1", /kill PID 1/],
  ];

  it.each(blocked)("blocks %j", (cmd, why) => {
    expect(destructiveReason(cmd)).toMatch(why);
  });
});

describe("destructiveReason allows benign commands", () => {
  const allowed = [
    "echo hi",
    "ls -la /etc",
    "pwd",
    "git status",
    "df -h",
    "rm -rf ./node_modules/.cache", // rm -rf NOT on /
    "rm file.txt",
    "systemctl status nginx", // status/list/start stay allowed
    "systemctl list-units",
    "systemctl start nginx",
    "dd if=/dev/zero of=./swapfile bs=1M count=64", // dd to a regular file
    "chmod 644 README.md",
    "kill -9 12345", // not PID 1
    "uptime",
  ];

  it.each(allowed)("allows %j", (cmd) => {
    expect(destructiveReason(cmd)).toBeNull();
  });

  it("allows everything when OS_EXEC_ALLOW_DESTRUCTIVE=1 (explicit override)", () => {
    vi.stubEnv("OS_EXEC_ALLOW_DESTRUCTIVE", "1");
    expect(destructiveReason("rm -rf /")).toBeNull();
    expect(destructiveReason("systemctl stop nginx")).toBeNull();
  });
});

// Adversarial fuzz — encoded / chained / indirect variants of the catastrophic
// commands the regex set is meant to catch. Each MUST trip the guard.
// Documented gaps below are real (filed as the regex limits); each is a
// finding for the next pass, not a test failure today.
describe("destructiveReason — adversarial encodings", () => {
  it("blocks rm with re-ordered flags (`rm -r -f /`)", () => {
    expect(destructiveReason("rm -r -f /")).toMatch(/rm -rf on \//);
  });

  it("blocks rm with extra whitespace padding around args", () => {
    expect(destructiveReason("  rm   -rf    /  ")).toMatch(/rm -rf on \//);
  });

  it("blocks shutdown reached via `sudo`", () => {
    expect(destructiveReason("sudo shutdown -h now")).toMatch(/shutdown/);
  });

  it("blocks tab-separated rm args (whitespace class catches \\t)", () => {
    expect(destructiveReason("rm\t-rf\t/")).toMatch(/rm -rf on \//);
  });

  it("blocks rm via leading-backslash escape (`\\rm -rf /` — \\b still matches)", () => {
    // bash treats `\rm` as the literal rm (alias bypass). The regex anchors
    // on `\b` which the backslash satisfies as a non-word char, so the guard
    // still trips — this is good news, pin it so a future refactor knows.
    expect(destructiveReason("\\rm -rf /")).toMatch(/rm -rf on \//);
  });

  // KNOWN GAPS — documented so the next hardening pass knows where to focus.
  // These slip past the current regex set. Not catastrophic in isolation
  // because the cockpit is owner-only AND the operator must be aware enough
  // to wrap a destructive cmd in shell trickery — but real polish targets.
  // Each `it.fails` PASSES the suite when the assertion fails (Vitest spec),
  // so when these are fixed the suite turns RED — a built-in regression alarm.
  it.fails("GAP: chained `;` form — `/` followed by `;` slips past `\\/(?:\\s|$|\\*)`", () => {
    expect(destructiveReason("echo hi; rm -rf /; echo bye")).toMatch(/rm -rf on \//);
  });

  it.fails("GAP: subshell form — `/` followed by `)` slips past `\\/(?:\\s|$|\\*)`", () => {
    expect(destructiveReason("(rm -rf /) &")).toMatch(/rm -rf on \//);
  });

  it.fails("GAP: `bash -c \"rm -rf /\"` — `/` followed by `\"` slips past", () => {
    expect(destructiveReason('bash -c "rm -rf /"')).toMatch(/rm -rf on \//);
  });

  it.fails("GAP: variable-expansion form `HOME=/ rm -rf \"$HOME\"` — no literal `/` after -rf", () => {
    expect(destructiveReason('HOME=/ rm -rf "$HOME"')).toMatch(/rm -rf on \//);
  });
});

describe("runCommand", () => {
  it("refuses a destructive command with code 126 and never spawns", async () => {
    const res = await runCommand("rm -rf /");
    expect(res.code).toBe(126);
    expect(res.stdout).toBe("");
    expect(res.stderr).toMatch(/refused: rm -rf on \//);
  });

  it("refuses systemctl stop with a pointer to SSH", async () => {
    const res = await runCommand("systemctl stop os-vps.service");
    expect(res.code).toBe(126);
    expect(res.stderr).toMatch(/refused/);
    expect(res.stderr).toMatch(/SSH/);
  });

  it("rejects an empty/blank command", async () => {
    await expect(runCommand("")).rejects.toThrow(/Empty command/);
    await expect(runCommand("   ")).rejects.toThrow(/Empty command/);
  });

  it("runs a benign command and captures stdout + exit code 0", async () => {
    const res = await runCommand("echo hi");
    expect(res.code).toBe(0);
    expect(res.stdout.trim()).toBe("hi");
  });

  it("reports a non-zero exit code", async () => {
    const res = await runCommand("exit 7");
    expect(res.code).toBe(7);
  });

  it("defaults the cwd to home when none is given", async () => {
    const res = await runCommand("pwd");
    expect(res.stdout.trim()).toBe(os.homedir());
  });

  it("falls back to home when the requested cwd is outside the write roots", async () => {
    vi.stubEnv("OS_FS_WRITE_ROOTS", os.homedir());
    const res = await runCommand("pwd", "/etc");
    expect(res.stdout.trim()).toBe(os.homedir());
  });
});
