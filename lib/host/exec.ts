// SERVER-ONLY. One-shot shell runner behind /api/v1/exec/run. Non-interactive:
// captured stdout/stderr + exit code, bounded time + output. cwd is constrained
// to the WRITE roots (falls back to home). The command itself is the
// session-authenticated owner's responsibility (this is a VPS-control OS — RCE
// for the owner is the point; the gate is the signed-cookie + approved device).
import { exec } from "child_process";
import path from "path";
import { promises as fs } from "fs";
import type { ExecResult } from "@/lib/os-api/types";
import { homeDir, isUnderRoot, writeRootList } from "./paths";

const TIMEOUT_MS = 30_000;
const MAX_OUTPUT = 1_000_000; // 1 MiB per stream

// High-confidence catastrophic patterns. The owner has a full shell by design,
// but these are commands that wreck the whole box and are almost never run on
// purpose through a web cockpit — blocked unless OS_EXEC_ALLOW_DESTRUCTIVE=1.
// Genuine disk surgery should go over SSH. `code: 126` = "command refused".
const DESTRUCTIVE: { re: RegExp; why: string }[] = [
  { re: /\brm\b(?:\s+-\S*)*\s+-\S*[rf]\S*\s+(?:--no-preserve-root\s+)?\/(?:\s|$|\*)/, why: "rm -rf on /" },
  { re: /--no-preserve-root/, why: "rm --no-preserve-root" },
  { re: /\bmkfs(?:\.\w+)?\b/, why: "mkfs (format a filesystem)" },
  { re: /\bdd\b[^\n]*\bof=\/dev\/(?:sd|nvme|vd|xvd|disk|hd)/, why: "dd to a block device" },
  { re: />\s*\/dev\/(?:sd|nvme|vd|xvd|hd)\w/, why: "redirect to a block device" },
  { re: /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, why: "fork bomb" },
  { re: /\b(?:chmod|chown)\b(?:\s+-\S*)*\s+-\S*R\S*\s+\S+\s+\/(?:\s|$)/, why: "recursive chmod/chown on /" },
  // Power/service control: a cockpit-issued restart can kill the cockpit's own
  // service (or the box) mid-request. status/list/start stay allowed.
  { re: /\bsystemctl\b[^\n;|&]*\b(?:stop|restart|disable|mask|isolate|kill)\b/, why: "systemctl stop/restart/disable — manage services over SSH" },
  { re: /\bservice\s+\S+\s+(?:stop|restart)\b/, why: "service stop/restart — manage services over SSH" },
  { re: /\b(?:shutdown|reboot|poweroff|halt)\b/, why: "shutdown/reboot/poweroff" },
  { re: /\binit\s+[06]\b/, why: "init 0/6" },
  { re: /\bkill\s+(?:-(?:9|KILL|SIGKILL)\s+)?1(?:\s|$)/, why: "kill PID 1" },
];

// Returns the reason a command is refused, or null when it may run.
export function destructiveReason(cmd: string): string | null {
  if (process.env.OS_EXEC_ALLOW_DESTRUCTIVE === "1") return null;
  for (const d of DESTRUCTIVE) if (d.re.test(cmd)) return d.why;
  return null;
}

async function resolveCwd(requested?: string): Promise<string> {
  const home = homeDir();
  if (!requested || requested === "~") return home;
  const absolute = requested.startsWith("~/")
    ? path.join(home, requested.slice(2))
    : path.resolve(requested);
  let real: string;
  try {
    real = await fs.realpath(absolute);
  } catch {
    return home; // cwd gone → fall back home rather than fail the command
  }
  const roots = await Promise.all(
    writeRootList().map(async (r) => {
      try {
        return await fs.realpath(r);
      } catch {
        return path.resolve(r);
      }
    }),
  );
  return roots.some((r) => isUnderRoot(real, r)) ? real : home;
}

export async function runCommand(cmd: string, cwd?: string): Promise<ExecResult> {
  if (typeof cmd !== "string" || !cmd.trim()) throw new Error("Empty command");
  const blocked = destructiveReason(cmd);
  if (blocked) {
    return {
      stdout: "",
      stderr: `refused: ${blocked}. Run it over SSH if you really mean it (or set OS_EXEC_ALLOW_DESTRUCTIVE=1).`,
      code: 126,
    };
  }
  const dir = await resolveCwd(cwd);
  return new Promise<ExecResult>((resolve) => {
    exec(
      cmd,
      { cwd: dir, timeout: TIMEOUT_MS, maxBuffer: MAX_OUTPUT, env: process.env, shell: "/bin/bash" },
      (err, stdout, stderr) => {
        const e = err as (Error & { code?: number; killed?: boolean }) | null;
        const code = e && typeof e.code === "number" ? e.code : e ? 1 : 0;
        resolve({
          stdout: String(stdout ?? ""),
          stderr: String(stderr ?? "") + (e && e.killed ? "\n[timed out after 30s]" : ""),
          code,
        });
      },
    );
  });
}
