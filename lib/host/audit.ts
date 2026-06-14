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
  | "auth.logout"
  | "framework.error";

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

export interface AuditRecord {
  ts?: string;
  action: string;
  actor?: string | null;
  ip?: string | null;
  target?: string;
  ok?: boolean;
  detail?: string;
}

// Read the tail of the audit log, newest-first, optionally filtered to actions
// with a given prefix (e.g. "browser."). Returns [] if the log doesn't exist.
// The single reader of the trail — routes must not re-derive the log path.
export async function readAuditTail(opts?: { prefix?: string; limit?: number }): Promise<AuditRecord[]> {
  const { prefix, limit = 100 } = opts ?? {};
  const raw = await fs.readFile(auditPath(), "utf8").catch(() => "");
  return raw
    .split("\n")
    .filter(Boolean)
    .slice(-500)
    .map((l) => {
      try {
        return JSON.parse(l) as AuditRecord;
      } catch {
        return null;
      }
    })
    .filter((e): e is AuditRecord => Boolean(e && typeof e.action === "string" && (!prefix || e.action.startsWith(prefix))))
    .slice(-limit)
    .reverse();
}

// Internal: serialize writes onto a single chained promise so bursty parallel
// callers land in submission order. The chain NEVER rejects (each link
// swallows + logs its own failure), otherwise one bad write would poison every
// subsequent audit call for the lifetime of the process.
let _writeChain: Promise<void> = Promise.resolve();

async function writeLine(line: string): Promise<void> {
  const file = auditPath();
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.appendFile(file, line, { mode: 0o600 });
  } catch (e) {
    console.error("[audit] write failed:", e instanceof Error ? e.message : e);
  }
}

// Append an audit entry. Returns a promise that resolves AFTER this entry's
// write completes (or fails — failures are swallowed; the trail is best-effort
// and must never break the caller). Callers may fire-and-forget the returned
// promise; ordering across concurrent callers is preserved via _writeChain.
export function audit(entry: AuditEntry): Promise<void> {
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
  _writeChain = _writeChain.then(() => writeLine(line));
  return _writeChain;
}
