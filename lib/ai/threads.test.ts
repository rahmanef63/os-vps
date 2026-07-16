import { describe, it, expect } from "vitest";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

// Point the store at a temp dir BEFORE importing (the dir is read at module load).
process.env.OS_THREADS_DIR = path.join(os.tmpdir(), `osvps-threads-test-${process.pid}`);
const { saveThread, getThread, listThreads, deleteThread } = await import("./threads");

describe("thread YAML store", () => {
  it("round-trips a thread through YAML (save → get → list → delete)", async () => {
    await saveThread({
      id: "thread_abc",
      title: "Hello",
      createdAt: 1,
      updatedAt: 1,
      messages: [{ role: "user", text: "hi: there\nline2" }],
      history: [{ role: "user", text: "hi" }],
    });
    const got = await getThread("thread_abc");
    expect(got?.title).toBe("Hello");
    // YAML must preserve colons + newlines inside message text.
    expect((got?.messages[0] as { text: string }).text).toBe("hi: there\nline2");

    expect((await listThreads()).map((s) => s.id)).toContain("thread_abc");
    await deleteThread("thread_abc");
    expect(await getThread("thread_abc")).toBeNull();
  });

  it("jails the filename against path traversal", async () => {
    await saveThread({ id: "a/../b", title: "x", createdAt: 1, updatedAt: 1, messages: [], history: [] });
    const names = await fs.readdir(process.env.OS_THREADS_DIR!);
    expect(names).toContain("ab.yml"); // "a/../b" → strip non-[a-z0-9_-] → "ab"
    expect(names.every((n) => !n.includes("/") && !n.includes(".."))).toBe(true);
  });
});
