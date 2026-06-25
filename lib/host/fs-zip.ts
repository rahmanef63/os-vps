// SERVER-ONLY. Streams a zip of selected entries via the host `zip` binary
// (Info-ZIP 3.0, already on the box) — no archive dependency, nothing buffered:
// `zip -r -q - -- names` writes the archive to stdout and we pipe it straight to
// the HTTP response (browser's download manager owns the progress). Each name is
// a plain basename inside `base`; `base` and every child are realpath'd + bounds-
// checked inside the READ roots (and credential-blocked) before zip runs. `--`
// ends options so a file literally named "-x" can't smuggle in a zip flag.
import { spawn } from "child_process";
import path from "path";
import type { Readable } from "stream";
import { HostError } from "./host-error";
import { resolveReadable } from "./paths";

// A selectable item is a single basename in the listed dir — never a path. Reject
// separators/traversal/NUL so a name can't escape `base` (defense-in-depth; the
// per-child resolveReadable below also realpaths + bounds-checks each one).
export function assertSafeName(name: string): void {
  if (!name || name === "." || name === ".." || /[/\\\0]/.test(name))
    throw new HostError("Invalid item name");
}

export async function zipStream(base: string, names: string[]): Promise<Readable> {
  if (!names.length) throw new HostError("No items to archive");
  const real = await resolveReadable(base);
  for (const n of names) {
    assertSafeName(n);
    await resolveReadable(path.join(real, n)); // realpath + read-root + credential gate
  }
  const child = spawn("zip", ["-r", "-q", "-", "--", ...names], { cwd: real });
  child.on("error", () => {}); // missing binary / spawn fail → empty/truncated stream
  return child.stdout;
}
