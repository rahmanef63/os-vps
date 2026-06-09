import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { TWEAK_DEFAULTS } from "@/lib/appearance/types";
import { readPrefs, writePrefs } from "./store";

let dir: string;
let file: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "os-vps-prefs-"));
  file = path.join(dir, "prefs.json");
  process.env.OS_PREFS_PATH = file;
});

afterEach(async () => {
  delete process.env.OS_PREFS_PATH;
  await fs.rm(dir, { recursive: true, force: true });
});

describe("lib/prefs/store", () => {
  it("readPrefs returns {} when the file is missing or corrupt", async () => {
    expect(await readPrefs()).toEqual({});
    await fs.writeFile(file, "not json", "utf8");
    expect(await readPrefs()).toEqual({});
  });

  it("writePrefs persists a section and stamps updatedAt", async () => {
    const quicklinks = [{ id: "gh", title: "GitHub", url: "https://github.com" }];
    const before = Date.now();
    await writePrefs({ quicklinks });
    const got = await readPrefs();
    expect(got.quicklinks).toEqual(quicklinks);
    expect(got.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it("merges sections: a later quicklinks write keeps stored tweaks", async () => {
    const { wallpaperStyle: _computed, ...tweaks } = { ...TWEAK_DEFAULTS, theme: "dark" as const };
    await writePrefs({ tweaks });
    await writePrefs({ quicklinks: [] });
    const got = await readPrefs();
    expect(got.tweaks?.theme).toBe("dark");
    expect(got.quicklinks).toEqual([]);
  });

  it("a section write replaces that section wholesale (last write wins)", async () => {
    await writePrefs({ quicklinks: [{ id: "a", title: "A", url: "https://a.com" }] });
    await writePrefs({ quicklinks: [{ id: "b", title: "B", url: "https://b.com" }] });
    const got = await readPrefs();
    expect(got.quicklinks).toHaveLength(1);
    expect(got.quicklinks?.[0]?.id).toBe("b");
  });

  it("writes the file with mode 0600 and no leftover tmp file", async () => {
    await writePrefs({ quicklinks: [] });
    const stat = await fs.stat(file);
    expect(stat.mode & 0o777).toBe(0o600);
    await expect(fs.stat(`${file}.tmp`)).rejects.toThrow();
  });
});
