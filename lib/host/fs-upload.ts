// SERVER-ONLY. Upload writers behind /api/v1/fs/upload. Writes follow WRITE
// roots (see paths.ts); each part is validated by assertUploadTarget, which
// enforces the SAME credential/sensitive denylist + realpath-bounds as
// writeFile/move/copy (so an upload can't write ~/.ssh/authorized_keys or escape
// the dest through a symlinked subdir). Split out of fs.ts for single responsibility.
import { promises as fs, createWriteStream } from "fs";
import { once } from "events";
import path from "path";
import { HostError } from "./host-error";
import { assertUploadTarget, safeWritePath } from "./paths";

const MAX_UPLOAD = 100 * 1024 * 1024; // 100 MiB per file

// Binary-safe batch upload into an EXISTING dir (within WRITE roots). Each item's
// relPath may carry folders ("imgs/a.png") — intermediate dirs are created. Path
// segments are sanitised (no "", ".", ".."), so an item can't escape `dest`.
export async function uploadInto(
  dest: string,
  files: { relPath: string; data: Uint8Array }[],
): Promise<{ written: number; failed: string[] }> {
  const destReal = await resolveUploadDest(dest);

  const failed: string[] = [];
  let written = 0;
  for (const { relPath, data } of files) {
    const segs = sanitiseSegments(relPath);
    if (!segs.length) { failed.push(relPath); continue; }
    if (data.byteLength > MAX_UPLOAD) { failed.push(`${relPath} (too large)`); continue; }
    const full = path.join(destReal, ...segs);
    try {
      await assertUploadTarget(full, destReal);
    } catch {
      failed.push(relPath);
      continue;
    }
    try {
      await fs.mkdir(path.dirname(full), { recursive: true });
      const tmp = `${full}.tmp-${process.pid}`;
      await fs.writeFile(tmp, data, { mode: 0o644 });
      await fs.rename(tmp, full);
      written++;
    } catch {
      failed.push(relPath);
    }
  }
  return { written, failed };
}

// Resolve + validate an EXISTING upload destination dir within WRITE roots. Done
// up-front (before the body is read) so a bad dest fails fast, and so the route
// never has to touch lib/host/paths directly.
export async function resolveUploadDest(dest: string): Promise<string> {
  const destReal = await safeWritePath(dest, true);
  if (!(await fs.stat(destReal)).isDirectory()) throw new HostError("Destination is not a directory");
  return destReal;
}

// Stream ONE file part (relPath + byte stream) into a pre-resolved dest dir.
// Spools to a .tmp via fs.createWriteStream (never a full Buffer in RAM), then
// atomic-renames. Aborts past MAX_UPLOAD, cleaning the tmp. Path segments are
// sanitised so a part can't escape `destReal`. The body iterator is ALWAYS fully
// drained (even on abort) so the multipart parser can advance to the next part.
// Returns ok|too-large|bad-path.
export async function streamFileInto(
  destReal: string,
  relPath: string,
  body: AsyncIterable<Uint8Array>,
): Promise<"ok" | "too-large" | "bad-path"> {
  const segs = sanitiseSegments(relPath);
  if (!segs.length) { await drain(body); return "bad-path"; }
  const full = path.join(destReal, ...segs);
  try {
    await assertUploadTarget(full, destReal);
  } catch {
    await drain(body);
    return "bad-path";
  }

  await fs.mkdir(path.dirname(full), { recursive: true });
  const tmp = `${full}.tmp-${process.pid}-${Date.now()}`;
  const out = createWriteStream(tmp, { mode: 0o644 });
  let bytes = 0;
  let tooLarge = false;
  try {
    // ONE pass over the body iterator: keep consuming after the cap is hit so the
    // remaining bytes drain (parser advances), but stop writing to disk.
    for await (const chunk of body) {
      if (tooLarge) continue; // drain-only past the cap
      bytes += chunk.byteLength;
      if (bytes > MAX_UPLOAD) { tooLarge = true; continue; }
      if (!out.write(chunk)) await once(out, "drain");
    }
    await new Promise<void>((res, rej) => out.end((err?: Error | null) => (err ? rej(err) : res())));
  } catch {
    out.destroy();
    await fs.rm(tmp, { force: true });
    throw new HostError("Failed to write upload");
  }
  if (tooLarge) {
    await fs.rm(tmp, { force: true });
    return "too-large";
  }
  await fs.rename(tmp, full);
  return "ok";
}

function sanitiseSegments(relPath: string): string[] {
  return relPath.split("/").map((s) => s.trim()).filter((s) => s && s !== "." && s !== "..");
}

async function drain(body: AsyncIterable<Uint8Array>): Promise<void> {
  for await (const _chunk of body) void _chunk; // discard remaining bytes
}
