// SERVER-ONLY. Append-only audit trail for privileged actions (shell exec, file
// mutations, browser actions, auth events). Single-owner tool that can run shell
// commands MUST keep a tamper-evident record — if something goes wrong, this is
// the only forensic trail. JSONL, one event per line, flushed best-effort.
//
// Location: $OS_AUDIT_LOG, else ~/.os-vps/audit.log. Reads are NOT audited
// (bounded + high-volume); only state-changing actions are.
import { promises as fs } from "fs";
import os from "os";
import path from "path";

export type AuditAction =
  | "exec.run"
  | "exec.blocked"
  | "term.open"
  | "term.close"
  | "fs.write"
  | "fs.delete"
  | "fs.move"
  | "fs.copy"
  | "fs.mkdir"
  | "fs.upload"
  | "browser.navigate"
  | "browser.click"
  | "browser.type"
  | "browser.key"
  | "browser.scroll"
  | "browser.fill"
  | "browser.clickSelector"
  | "browser.back"
  | "browser.forward"
  | "browser.reload"
  | "auth.login"
  | "auth.pending"
  | "auth.denied"
  | "auth.ratelimited"
  | "auth.logout";

export interface AuditEntry {
  action: AuditAction;
  /** Approved device id from the session (the actor), when known. */
  actor?: string | null;
  /** Request origin IP, when available (auth events). */
  ip?: string | null;
  /** Primary target — a path, URL, or command (truncated). */
  target?: string;
  /** Outcome flag; false = failed/blocked/denied. */
  ok?: boolean;
  /** Optional extra context (exit code, reason). */
  detail?: string;
}

function auditPath(): string {
  const env = process.env.OS_AUDIT_LOG;
  if (env && env.trim()) return env.replace(/^~(?=$|\/)/, os.homedir());
  return path.join(os.homedir(), ".os-vps", "audit.log");
}

function trunc(s: string | undefined, max = 512): string | undefined {
  if (s == null) return undefined;
  return s.length > max ? s.slice(0, max) + "…" : s;
}

// Fire-and-forget. A failed audit write must never break the action it records,
// but it is logged to stderr so a broken trail is at least visible in journald.
export function audit(entry: AuditEntry): void {
  const line =
    JSON.stringify({
      ts: new Date().toISOString(),
      action: entry.action,
      actor: entry.actor ?? null,
      ip: entry.ip ?? null,
      target: trunc(entry.target),
      ok: entry.ok ?? true,
      detail: trunc(entry.detail, 256),
    }) + "\n";
  const file = auditPath();
  void fs
    .mkdir(path.dirname(file), { recursive: true })
    .then(() => fs.appendFile(file, line, { mode: 0o600 }))
    .catch((e) => console.error("[audit] write failed:", e instanceof Error ? e.message : e));
}
