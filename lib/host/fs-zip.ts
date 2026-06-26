// SERVER-ONLY. Streams a zip of selected entries via the host `zip` binary
// (Info-ZIP 3.0, already on the box) — no archive dependency, nothing buffered:
// `zip` writes the archive to stdout and we pipe it straight to the HTTP response
// (browser's download manager owns the progress). Each name is a plain basename
// inside `base`; `base` and every child are realpath'd + bounds-checked inside the
// READ roots (and credential-blocked) before zip runs. Names are `./`-prefixed so a
// file literally named "-x" can't be read as a flag — we can't use `--` here because
// `--` also disables the TRAILING `-x` exclude options (verified on the host).
// `exclude` (heavy dirs like node_modules/.git) → `-x */name/*`; Info-ZIP `*` spans
// `/`, so one pattern drops that dir at any depth. Excludes only NARROW the archive
// (never widen access), so they're low-risk, but each is still a safe basename.
import { spawn } from "child_process";
import path from "path";
import type { Readable } from "stream";
import { HostError } from "./host-error";
import { appDir, resolveReadable } from "./paths";

// A selectable item is a single basename in the listed dir — never a path. Reject
// separators/traversal/NUL so a name can't escape `base` (defense-in-depth; the
// per-child resolveReadable below also realpaths + bounds-checks each one).
export function assertSafeName(name: string): void {
  if (!name || name === "." || name === ".." || /[/\\\0]/.test(name))
    throw new HostError("Invalid item name");
}

// Forced excludes that guard the app's OWN secrets no matter what the user picks:
// when APP_DIR is nested inside the archived base, `zip -r` would recurse into it
// past the per-name credential gate, so strip its `.env*` (OS_SESSION_SECRET).
// Returns [] when base is APP_DIR itself or unrelated to it.
export function appSecretExcludes(realBase: string): string[] {
  const rel = path.relative(realBase, appDir());
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return [];
  return [`${rel}/.env`, `${rel}/.env.*`];
}

export async function zipStream(
  base: string,
  names: string[],
  exclude: string[] = [],
): Promise<Readable> {
  if (!names.length) throw new HostError("No items to archive");
  const real = await resolveReadable(base);
  for (const n of names) {
    assertSafeName(n);
    await resolveReadable(path.join(real, n)); // realpath + read-root + credential gate
  }
  // `-y` = store symlinks AS links, never follow. Without it `zip -r` archives a
  // link's TARGET content, escaping the realpath/credential bounds checked above
  // (a link to ~/.ssh/id_rsa inside a zipped dir would otherwise leak).
  const args = ["-r", "-y", "-q", "-", ...names.map((n) => `./${n}`)];
  const patterns: string[] = [];
  for (const name of exclude) {
    assertSafeName(name); // a dir basename, never a raw pattern from the client
    patterns.push(`*/${name}/*`);
  }
  patterns.push(...appSecretExcludes(real)); // forced credential guard, see above
  if (patterns.length) args.push("-x", ...patterns);
  // stdin/stderr ignored: stderr unread would fill its pipe on a tree with many
  // unreadable files and deadlock the stream; we don't surface zip's warnings.
  const child = spawn("zip", args, { cwd: real, stdio: ["ignore", "pipe", "ignore"] });
  child.on("error", () => {}); // missing binary / spawn fail → empty/truncated stream
  return child.stdout!; // stdout is "pipe" above, so always present

}
