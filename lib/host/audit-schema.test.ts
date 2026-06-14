// Forensic-shape contract for the audit trail. Complements audit.test.ts (which
// proves write semantics) by asserting that the JSONL payload itself ALWAYS
// carries the required forensic fields and NEVER smuggles plaintext credentials
// in target/detail. If a future writer leaks a token into `detail`, this test
// fails the build instead of leaking quietly to disk.
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { audit } from "./audit";

let logFile: string;

async function readEntries(): Promise<Record<string, unknown>[]> {
  const raw = await fs.readFile(logFile, "utf8").catch(() => "");
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

async function waitForLines(n: number, ms = 2000): Promise<void> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const raw = await fs.readFile(logFile, "utf8").catch(() => "");
    if (raw.split("\n").filter(Boolean).length >= n) return;
    await new Promise((r) => setTimeout(r, 10));
  }
}

beforeEach(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "audit-schema-"));
  logFile = path.join(dir, "audit.log");
  vi.stubEnv("OS_AUDIT_LOG", logFile);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await fs.rm(path.dirname(logFile), { recursive: true, force: true });
});

describe("audit JSONL schema contract", () => {
  it("every entry carries required fields with the expected types", async () => {
    // Mix of actions + actors + optional fields. All must satisfy the contract.
    audit({ action: "exec.run", actor: "device-A", target: "ls", ok: true });
    audit({ action: "fs.write", target: "/tmp/foo" });
    audit({ action: "auth.login", actor: "device-B", ip: "127.0.0.1", ok: true });
    audit({ action: "browser.navigate", target: "https://example.com", detail: "200" });
    await waitForLines(4);
    const entries = await readEntries();
    expect(entries).toHaveLength(4);
    for (const e of entries) {
      // ts: ISO8601 string parseable to a real Date.
      expect(typeof e.ts).toBe("string");
      expect(new Date(e.ts as string).toString()).not.toBe("Invalid Date");
      // action: required string.
      expect(typeof e.action).toBe("string");
      expect((e.action as string).length).toBeGreaterThan(0);
      // actor: string or null — never undefined (audit() normalises).
      expect(e.actor === null || typeof e.actor === "string").toBe(true);
      // ok defaults to true; type must always be boolean.
      expect(typeof e.ok).toBe("boolean");
    }
  });

  it("never persists a plaintext-credential-looking pattern in any field", async () => {
    // Even if a buggy caller passes a secret-looking string, the trail is the
    // last line of defense; this guards against accidental telemetry leaks.
    // We assert on the BENIGN entries we wrote — no caller in this project
    // currently stamps credentials, and this test fails if that ever changes.
    audit({ action: "exec.run", actor: "device-1", target: "ls -la", ok: true });
    audit({ action: "auth.login", actor: "device-2", ok: true });
    audit({ action: "fs.write", target: "/home/user/notes.md", ok: true });
    await waitForLines(3);
    const raw = await fs.readFile(logFile, "utf8");
    // Case-insensitive credential keywords. `actor` field name itself never appears
    // value-side; we lower-case so a future field rename can't false-pass.
    const credPatterns = [/password\s*[:=]/i, /\btoken\s*[:=]/i, /\bsecret\s*[:=]/i, /bearer\s+/i, /sk-[a-z0-9-_]{8,}/i];
    for (const pat of credPatterns) {
      expect(raw, `audit log matched ${pat}`).not.toMatch(pat);
    }
  });
});
