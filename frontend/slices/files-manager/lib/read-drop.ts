import type { UploadFile } from "./host";

// Walk a drop's DataTransfer into a flat {relPath, file} list, preserving folder
// structure via the webkit Entry API. Falls back to the flat `files` list when
// the Entry API is unavailable. NOTE: `dt.items` must be read synchronously by
// the caller's drop handler (before any await) or the browser invalidates it —
// this fn grabs the entries before its first await, so pass it `e.dataTransfer`.
export async function readDropEntries(dt: DataTransfer): Promise<UploadFile[]> {
  const entries = Array.from(dt.items ?? [])
    .map((it) => (it.kind === "file" && it.webkitGetAsEntry ? it.webkitGetAsEntry() : null))
    .filter((e): e is FileSystemEntry => e != null);

  if (!entries.length) {
    return Array.from(dt.files ?? []).map((file) => ({ relPath: file.name, file }));
  }
  const out: UploadFile[] = [];
  await Promise.all(entries.map((e) => walk(e, "", out)));
  // Fallback: if the Entry walk yielded nothing (e.g. a browser without dir
  // support), still take any flat files the drop carried.
  if (!out.length) return Array.from(dt.files ?? []).map((file) => ({ relPath: file.name, file }));
  return out;
}

function walk(entry: FileSystemEntry, prefix: string, out: UploadFile[]): Promise<void> {
  if (entry.isFile) {
    return new Promise((resolve) =>
      (entry as FileSystemFileEntry).file(
        (file) => {
          out.push({ relPath: prefix + entry.name, file });
          resolve();
        },
        () => resolve(),
      ),
    );
  }
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const dirPrefix = `${prefix}${entry.name}/`;
  return new Promise((resolve) => {
    const children: FileSystemEntry[] = [];
    // readEntries returns in batches; keep calling until it yields an empty one.
    const readBatch = () =>
      reader.readEntries(
        (batch) => {
          if (!batch.length) {
            void Promise.all(children.map((c) => walk(c, dirPrefix, out))).then(() => resolve());
            return;
          }
          children.push(...batch);
          readBatch();
        },
        () => resolve(),
      );
    readBatch();
  });
}
