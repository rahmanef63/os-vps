import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { assertNotRoot, isUnderRoot, resolveReadable, safeWritePath } from "./paths";

// Real temp tree (realpath runs on every request, so files must exist):
//   base/read/            ← read root
//   base/read/inside.txt
//   base/read/sneaky      → symlink to base/outside/secret.txt
//   base/read/write/      ← write root (narrower than read)
//   base/read/write/wlink → symlink to base/outside/secret.txt
//   base/outside/secret.txt
let base = "";
let readRoot = "";
let writeRoot = "";
let outside = "";

beforeAll(() => {
  base = realpathSync(mkdtempSync(path.join(os.tmpdir(), "osvps-paths-")));
  readRoot = path.join(base, "read");
  writeRoot = path.join(readRoot, "write");
  outside = path.join(base, "outside");
  mkdirSync(writeRoot, { recursive: true });
  mkdirSync(outside, { recursive: true });
  writeFileSync(path.join(readRoot, "inside.txt"), "ok");
  writeFileSync(path.join(writeRoot, "wfile.txt"), "ok");
  writeFileSync(path.join(outside, "secret.txt"), "nope");
  symlinkSync(path.join(outside, "secret.txt"), path.join(readRoot, "sneaky"));
  symlinkSync(path.join(outside, "secret.txt"), path.join(writeRoot, "wlink"));
});

afterAll(() => rmSync(base, { recursive: true, force: true }));
afterEach(() => vi.unstubAllEnvs());

function useRoots(read: string, write: string) {
  vi.stubEnv("OS_FS_READ_ROOTS", read);
  vi.stubEnv("OS_FS_WRITE_ROOTS", write);
}

describe("isUnderRoot", () => {
  it("accepts the root itself and children, rejects siblings and parents", () => {
    expect(isUnderRoot("/a/b", "/a/b")).toBe(true);
    expect(isUnderRoot("/a/b/c.txt", "/a/b")).toBe(true);
    expect(isUnderRoot("/a/bb", "/a/b")).toBe(false); // prefix-string trap
    expect(isUnderRoot("/a", "/a/b")).toBe(false);
    expect(isUnderRoot("/etc/passwd", "/home/x")).toBe(false);
  });
});

describe("resolveReadable bounds", () => {
  it("resolves a path inside the read root", async () => {
    useRoots(readRoot, writeRoot);
    await expect(resolveReadable(path.join(readRoot, "inside.txt"))).resolves.toBe(
      path.join(readRoot, "inside.txt"),
    );
  });

  it("rejects ../ traversal that escapes the read root", async () => {
    useRoots(readRoot, writeRoot);
    const sneaky = `${readRoot}/../outside/secret.txt`;
    await expect(resolveReadable(sneaky)).rejects.toThrow(/outside readable roots/i);
  });

  it("rejects a symlink inside the root that points outside it", async () => {
    useRoots(readRoot, writeRoot);
    await expect(resolveReadable(path.join(readRoot, "sneaky"))).rejects.toThrow(
      /outside readable roots/i,
    );
  });
});

describe("credential denylist (read root = / so only the denylist gates)", () => {
  const home = os.homedir();
  const sshDir = path.join(home, ".ssh");
  const storeDir = path.join(home, ".os-vps");
  const envLocal = path.join(process.cwd(), ".env.local");
  const envExample = path.join(process.cwd(), ".env.example");

  it.skipIf(!existsSync(sshDir))("blocks ~/.ssh even inside a legal root", async () => {
    useRoots("/", writeRoot);
    await expect(resolveReadable(sshDir)).rejects.toThrow(/credential|sensitive/i);
  });

  it.skipIf(!existsSync(storeDir))("blocks the ~/.os-vps config store", async () => {
    useRoots("/", writeRoot);
    await expect(resolveReadable(storeDir)).rejects.toThrow(/credential|sensitive/i);
  });

  it.skipIf(!existsSync(envLocal))("blocks the app's own .env.local", async () => {
    useRoots("/", writeRoot);
    await expect(resolveReadable(envLocal)).rejects.toThrow(/credential|sensitive/i);
  });

  it.skipIf(!existsSync(envExample))("still allows .env.example (no secrets)", async () => {
    useRoots("/", writeRoot);
    await expect(resolveReadable(envExample)).resolves.toBe(realpathSync(envExample));
  });
});

describe("safeWritePath bounds", () => {
  it("allows writing to an existing file inside the write root", async () => {
    useRoots(readRoot, writeRoot);
    await expect(safeWritePath(path.join(writeRoot, "wfile.txt"), true)).resolves.toBe(
      path.join(writeRoot, "wfile.txt"),
    );
  });

  it("allows a new file whose parent is inside the write root", async () => {
    useRoots(readRoot, writeRoot);
    await expect(safeWritePath(path.join(writeRoot, "new.txt"), false)).resolves.toBe(
      path.join(writeRoot, "new.txt"),
    );
  });

  it("rejects writes to a read-only area (inside read root, outside write root)", async () => {
    useRoots(readRoot, writeRoot);
    await expect(safeWritePath(path.join(readRoot, "inside.txt"), true)).rejects.toThrow(
      /outside writable roots/i,
    );
  });

  it("rejects a new file whose parent is outside the write root", async () => {
    useRoots(readRoot, writeRoot);
    await expect(safeWritePath(path.join(readRoot, "new.txt"), false)).rejects.toThrow(
      /outside writable roots/i,
    );
  });

  it("rejects ../ traversal out of the write root", async () => {
    useRoots(readRoot, writeRoot);
    await expect(
      safeWritePath(`${writeRoot}/../../outside/secret.txt`, true),
    ).rejects.toThrow(/outside writable roots/i);
  });

  it("rejects writing through a symlink that escapes the write root", async () => {
    useRoots(readRoot, writeRoot);
    await expect(safeWritePath(path.join(writeRoot, "wlink"), true)).rejects.toThrow(
      /outside writable roots/i,
    );
  });

  it("collapses '/' to home, never the filesystem root", async () => {
    useRoots(readRoot, os.homedir());
    await expect(safeWritePath("/", true)).resolves.toBe(realpathSync(os.homedir()));
  });
});

describe("assertNotRoot", () => {
  it("refuses to modify a write root itself but allows its children", async () => {
    useRoots(readRoot, writeRoot);
    await expect(assertNotRoot(writeRoot)).rejects.toThrow(/root directory/i);
    await expect(assertNotRoot(path.join(writeRoot, "wfile.txt"))).resolves.toBeUndefined();
  });
});
