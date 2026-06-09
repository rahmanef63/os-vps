import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { Tweaks } from "@/lib/appearance";
import type { Quicklink } from "@/lib/quicklinks";

// Cross-device prefs (appearance tweaks + quicklinks), mirroring lib/config/store:
// a host JSON file (chmod 600) read/written server-side only, atomic tmp+rename.
// `wallpaperStyle` is computed client-side from `wallpaperImage` (parseImage →
// withWallpaperStyle), so it is never persisted — the route strips it.

/** Persisted tweaks: everything except the computed CSS style object. */
export type PrefTweaks = Omit<Tweaks, "wallpaperStyle">;

export interface OsPrefs {
  tweaks?: PrefTweaks;
  quicklinks?: Quicklink[];
  updatedAt?: number;
}

// Resolved lazily (not module-level) so tests can point OS_PREFS_PATH at a tmp dir.
function prefsPath(): string {
  return process.env.OS_PREFS_PATH ?? path.join(os.homedir(), ".os-vps", "prefs.json");
}

export async function readPrefs(): Promise<OsPrefs> {
  try {
    return JSON.parse(await fs.readFile(prefsPath(), "utf8")) as OsPrefs;
  } catch {
    return {};
  }
}

/** Section-level merge (last write wins per section) + updatedAt stamp. */
export async function writePrefs(patch: Partial<OsPrefs>): Promise<OsPrefs> {
  const file = prefsPath();
  const current = await readPrefs();
  const next: OsPrefs = { ...current, ...patch, updatedAt: Date.now() };
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(tmp, file);
  return next;
}
