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
