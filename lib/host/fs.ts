// SERVER-ONLY. Host filesystem ops behind /api/v1/fs/*. Reads follow READ
// roots (browse), mutations follow WRITE roots (see paths.ts). Returns the
// os-rr shapes directly so route handlers are thin.
import { promises as fs, createReadStream, type ReadStream } from "fs";
import path from "path";
import type { FsList, FsUsage } from "@/lib/os-api/types";
import { HostError } from "./host-error";
import {
  assertNotRoot,
  isSensitivePath,
  resolveReadable,
  resolveRoots,
  safeWritePath,
} from "./paths";

export async function listDir(requested: string, includeHidden = true): Promise<FsList> {
  const real = await resolveReadable(requested || "~");
  const stat = await fs.stat(real);
  if (!stat.isDirectory()) throw new HostError("Not a directory");

  const raw = await fs.readdir(real, { withFileTypes: true });
  const entries = raw
    .filter((e) => includeHidden || !e.name.startsWith("."))
    // Sensitive credential dirs don't even appear in listings (they're also
    // unreadable via resolveReadable — this just removes the temptation).
    .filter((e) => !isSensitivePath(path.join(real, e.name)))
    .map((e) => {
      const isDir = e.isDirectory() || e.isSymbolicLink();
      return {
        name: e.name,
        kind: isDir ? ("dir" as const) : ("file" as const),
        size: 0, // per-entry stat skipped for speed (matches prior agent behavior)
        ext: e.name.includes(".") ? e.name.split(".").pop() : undefined,
      };
    })
    .sort((a, b) => (a.kind !== b.kind ? (a.kind === "dir" ? -1 : 1) : a.name.localeCompare(b.name)));

  const parentCandidate = path.dirname(real);
  let parent: string | null = null;
  if (parentCandidate !== real) {
    try {
      await resolveReadable(parentCandidate);
      parent = parentCandidate;
    } catch {
      parent = null;
    }
  }
  return { path: real, entries, roots: resolveRoots(), parent };
}

export async function readFile(requested: string): Promise<string> {
  const p = await resolveReadable(requested);
  const stat = await fs.stat(p);
  if (stat.isDirectory()) throw new HostError("Is a directory");
  if (stat.size > 5_000_000) throw new HostError("File too large to read (max 5 MiB)");
  return fs.readFile(p, "utf8");
}

export async function writeFile(requested: string, content: string): Promise<void> {
  const p = await safeWritePath(requested, false);
  await assertNotRoot(p);
  const tmp = `${p}.tmp-${process.pid}`;
  await fs.writeFile(tmp, content ?? "", { mode: 0o644 });
  await fs.rename(tmp, p);
}

export async function makeDir(requested: string): Promise<void> {
  const p = await safeWritePath(requested, false);
  await fs.mkdir(p, { recursive: true });
}

export async function remove(requested: string): Promise<void> {
  const p = await safeWritePath(requested, true);
  await assertNotRoot(p);
  await fs.rm(p, { recursive: true, force: true });
}

export async function move(from: string, to: string): Promise<void> {
  const src = await safeWritePath(from, true);
  await assertNotRoot(src);
  const dest = await safeWritePath(to, false);
  try {
    await fs.rename(src, dest);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EXDEV") {
      await fs.cp(src, dest, { recursive: true });
      await fs.rm(src, { recursive: true, force: true });
    } else {
      throw err;
    }
  }
}

export async function copy(from: string, to: string): Promise<void> {
  const src = await safeWritePath(from, true);
  const dest = await safeWritePath(to, false);
  await fs.cp(src, dest, { recursive: true });
}

// Folder name search under a READ-root dir (default ~/projects). Depth/result
// bounded; skips heavy/noise dirs so it stays snappy on a real projects tree.
const SEARCH_SKIP = new Set([
  "node_modules", ".git", ".next", "dist", "build", ".cache", "vendor", ".pnpm-store", ".turbo",
]);

export async function searchFs(
  query: string,
  opts: { root?: string; max?: number; maxDepth?: number } = {},
): Promise<{ name: string; path: string; kind: "dir" }[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const root = await resolveReadable(opts.root ?? "~/projects"); // jailed to read roots
  const max = opts.max ?? 30;
  const maxDepth = opts.maxDepth ?? 6;
  const out: { name: string; path: string; kind: "dir" }[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (out.length >= max || depth > maxDepth) return;
    let ents: import("fs").Dirent[];
    try {
      ents = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      if (out.length >= max) return;
      if (!e.isDirectory()) continue;
      if (e.name.toLowerCase().includes(q)) out.push({ name: e.name, path: path.join(dir, e.name), kind: "dir" });
      if (!SEARCH_SKIP.has(e.name) && !e.name.startsWith(".")) await walk(path.join(dir, e.name), depth + 1);
    }
  }
  await walk(root, 0);
  return out;
}

export async function usage(requested: string): Promise<FsUsage> {
  const p = await resolveReadable(requested || "~");
  const s = await fs.statfs(p);
  const total = s.blocks * s.bsize;
  const free = s.bfree * s.bsize;
  return { used: total - free, total };
}

// --- raw byte serving (images / video / audio / pdf preview) ---

const MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", svg: "image/svg+xml", avif: "image/avif", bmp: "image/bmp",
  ico: "image/x-icon", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime",
  mkv: "video/x-matroska", avi: "video/x-msvideo", ogv: "video/ogg",
  mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", flac: "audio/flac",
  aiff: "audio/aiff", ogg: "audio/ogg", oga: "audio/ogg", pdf: "application/pdf",
};

export function mimeFor(p: string): string {
  return MIME[p.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}

// Resolve + stat a readable file (within READ roots) for byte streaming.
export async function statReadable(
  requested: string,
): Promise<{ path: string; size: number; mime: string }> {
  const p = await resolveReadable(requested);
  const st = await fs.stat(p);
  if (st.isDirectory()) throw new HostError("Is a directory");
  return { path: p, size: st.size, mime: mimeFor(p) };
}

// Node read stream for a (pre-resolved) path, optionally a byte range.
export function fileStream(p: string, start?: number, end?: number): ReadStream {
  return start !== undefined ? createReadStream(p, { start, end }) : createReadStream(p);
}
