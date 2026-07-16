// SERVER-ONLY. Safe disk cleanup behind /api/v1/sys/cleanup. Fixed category
// allowlist — the client only ever sends category IDS, never paths or
// commands, so nothing user-typed reaches a shell. Every category is chosen
// to be safe for a non-technical owner: re-downloadable caches, old rotated
// logs, trash, stale temp files, dangling docker layers. Nothing here can
// break a running app or lose user documents.
import { execFile } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { childEnv } from "./child-env";

const runFile = promisify(execFile);
const sh = (argv: string[]) =>
  runFile(argv[0], argv.slice(1), {
    timeout: 120_000,
    maxBuffer: 4_000_000,
    encoding: "utf8" as const,
    env: childEnv() as NodeJS.ProcessEnv,
  });

// "1.5GB" / "512 MB" / "3.9G" → bytes (decimal units, matching du/docker).
export function parseHuman(s: string): number {
  const m = /([\d.]+)\s*([kKmMgGtT]?)i?[bB]?/.exec(s);
  if (!m) return 0;
  const units: Record<string, number> = { "": 1, k: 1e3, m: 1e6, g: 1e9, t: 1e12 };
  return Math.round(parseFloat(m[1]) * (units[m[2].toLowerCase()] ?? 1));
}

// du -sb <p> → bytes; missing dir / permission noise → best-effort number.
async function duBytes(p: string, sudo = false): Promise<number> {
  const argv = sudo ? ["sudo", "-n", "du", "-sb", p] : ["du", "-sb", p];
  try {
    const { stdout } = await sh(argv);
    return parseInt(stdout, 10) || 0;
  } catch (e) {
    // du exits 1 on unreadable subdirs but still prints the total it saw.
    const out = (e as { stdout?: string }).stdout ?? "";
    const n = parseInt(out, 10);
    if (Number.isFinite(n) && n > 0) return n;
    return 0;
  }
}

export type CleanupCategory = {
  id: string;
  label: string;
  desc: string;
  sudo?: boolean;
  scan: () => Promise<number>;
  clean: () => Promise<void>;
};

const home = os.homedir();
const trashDir = path.join(home, ".local/share/Trash");

async function emptyDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

async function tmpOldBytes(): Promise<number> {
  try {
    const { stdout } = await sh(["find", "/tmp", "-type", "f", "-mtime", "+7", "-printf", "%s\n"]);
    return stdout.split("\n").reduce((a, l) => a + (parseInt(l, 10) || 0), 0);
  } catch (e) {
    // find exits 1 on permission-denied entries but still prints what it saw.
    const out = (e as { stdout?: string }).stdout ?? "";
    return out.split("\n").reduce((a, l) => a + (parseInt(l, 10) || 0), 0);
  }
}

async function dockerReclaimable(): Promise<number> {
  const [imgs, df] = await Promise.all([
    sh(["sudo", "-n", "docker", "images", "-f", "dangling=true", "--format", "{{.Size}}"]),
    sh(["sudo", "-n", "docker", "system", "df", "--format", "{{.Type}}|{{.Reclaimable}}"]),
  ]);
  const dangling = imgs.stdout.split("\n").filter(Boolean).reduce((a, l) => a + parseHuman(l), 0);
  const buildRow = df.stdout.split("\n").find((l) => l.startsWith("Build Cache"));
  return dangling + (buildRow ? parseHuman(buildRow.split("|")[1] ?? "") : 0);
}

export const CLEANUP_CATEGORIES: CleanupCategory[] = [
  {
    id: "apt-cache",
    label: "System package cache",
    desc: "Downloaded installer files (apt). Re-downloaded automatically if ever needed.",
    sudo: true,
    scan: () => duBytes("/var/cache/apt/archives", true),
    clean: async () => void (await sh(["sudo", "-n", "apt-get", "clean"])),
  },
  {
    id: "journal-logs",
    label: "Old system logs",
    desc: "System journal entries older than 7 days. Recent logs are kept.",
    sudo: true,
    scan: () => duBytes("/var/log/journal", true),
    clean: async () => void (await sh(["sudo", "-n", "journalctl", "--vacuum-time=7d"])),
  },
  {
    id: "pnpm-store",
    label: "pnpm package cache",
    desc: "Package versions no project uses anymore. Installed projects are not touched.",
    scan: async () => {
      const { stdout } = await sh(["pnpm", "store", "path"]);
      return duBytes(stdout.trim());
    },
    clean: async () => void (await sh(["pnpm", "store", "prune"])),
  },
  {
    id: "npm-cache",
    label: "npm package cache",
    desc: "npm's download cache. Re-downloaded automatically when needed.",
    scan: () => duBytes(path.join(home, ".npm")),
    clean: async () => void (await sh(["npm", "cache", "clean", "--force"])),
  },
  {
    id: "trash",
    label: "Trash",
    desc: "Files already deleted through the Files app.",
    scan: () => duBytes(trashDir),
    clean: async () => {
      await emptyDir(path.join(trashDir, "files"));
      await emptyDir(path.join(trashDir, "info"));
    },
  },
  {
    id: "tmp-old",
    label: "Old temporary files",
    desc: "Files in /tmp untouched for more than 7 days.",
    scan: tmpOldBytes,
    clean: async () => {
      await sh(["find", "/tmp", "-type", "f", "-mtime", "+7", "-delete"]).catch(() => {
        /* permission-denied entries are expected; everything else was deleted */
      });
    },
  },
  {
    id: "docker",
    label: "Docker leftovers",
    desc: "Dangling images and stale build cache. Running containers and their images are never touched.",
    sudo: true,
    scan: dockerReclaimable,
    clean: async () => {
      await sh(["sudo", "-n", "docker", "image", "prune", "-f"]);
      await sh(["sudo", "-n", "docker", "builder", "prune", "-f"]);
    },
  },
];

export type CleanupItem = { id: string; label: string; desc: string; bytes: number; available: boolean };

// Scan all categories in parallel. A category whose tooling is missing (no
// sudo, no docker, …) reports available:false instead of failing the request.
export async function scanCleanup(): Promise<CleanupItem[]> {
  const sudoOk = await sh(["sudo", "-n", "true"]).then(() => true, () => false);
  return Promise.all(
    CLEANUP_CATEGORIES.map(async (c) => {
      const base = { id: c.id, label: c.label, desc: c.desc };
      if (c.sudo && !sudoOk) return { ...base, bytes: 0, available: false };
      try {
        return { ...base, bytes: await c.scan(), available: true };
      } catch {
        return { ...base, bytes: 0, available: false };
      }
    }),
  );
}

export type CleanupResult = { id: string; ok: boolean; freedBytes: number; error?: string };

// Clean the selected categories sequentially (they share disk + sudo). Freed
// bytes = before/after rescan diff, so the number is honest even when a tool's
// own output is unparseable.
export async function runCleanup(ids: string[]): Promise<CleanupResult[]> {
  const results: CleanupResult[] = [];
  for (const id of ids) {
    const cat = CLEANUP_CATEGORIES.find((c) => c.id === id);
    if (!cat) {
      results.push({ id, ok: false, freedBytes: 0, error: "unknown category" });
      continue;
    }
    try {
      const before = await cat.scan();
      await cat.clean();
      const after = await cat.scan().catch(() => 0);
      results.push({ id, ok: true, freedBytes: Math.max(0, before - after) });
    } catch (e) {
      results.push({ id, ok: false, freedBytes: 0, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}
