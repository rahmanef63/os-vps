import type { UploadFile, UploadProgress, UploadResult } from "./types";

// Why this exists: the old upload was ONE multipart POST of the whole batch via
// fetch(). fetch() can't report upload progress (so no progress bar), and a big
// folder buffered the entire payload server-side (2× RAM) — a single timeout,
// proxy body-limit (nginx default 1 MB!) or network blip lost EVERYTHING.
//
// This splits the batch into small requests sent over XMLHttpRequest:
//  • XHR exposes upload.onprogress → a real determinate progress bar.
//  • Each request stays small → survives proxy body caps, bounds server memory.
//  • A failed batch is recorded (its files → `failed`) WITHOUT aborting the rest,
//    so partial success survives; only a total wipeout throws (caller shows why).

const BATCH_BYTES = 16 * 1024 * 1024; // ~16 MB/request
const BATCH_FILES = 40; // also cap file COUNT (folders of many tiny files)

// Split into batches bounded by cumulative bytes AND file count. A single file
// larger than BATCH_BYTES still becomes its own (one-file) batch.
export function batchFiles(files: UploadFile[]): UploadFile[][] {
  const batches: UploadFile[][] = [];
  let cur: UploadFile[] = [];
  let bytes = 0;
  for (const f of files) {
    const size = f.file.size || 0;
    if (cur.length && (bytes + size > BATCH_BYTES || cur.length >= BATCH_FILES)) {
      batches.push(cur);
      cur = [];
      bytes = 0;
    }
    cur.push(f);
    bytes += size;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

// One multipart POST over XHR. relPath rides as the part filename (folders kept).
function postBatch(
  url: string,
  dest: string,
  batch: UploadFile[],
  onLoaded: (loaded: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("dest", dest);
    for (const f of batch) fd.append("file", f.file, f.relPath);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "json";
    xhr.withCredentials = true; // same-origin session cookie
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onLoaded(e.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const r = (xhr.response ?? {}) as UploadResult;
        resolve({ written: r.written ?? batch.length, failed: r.failed ?? [] });
      } else {
        const msg = (xhr.response as { error?: string } | null)?.error;
        // 413 = payload too large (proxy/Next body cap) — name it so it's fixable.
        reject(new Error(msg || (xhr.status === 413 ? "Upload too large (413)" : `Upload failed (${xhr.status})`)));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.send(fd);
  });
}

// Chunked, progress-reporting upload. Resolves with aggregate {written, failed};
// throws only when NOTHING landed (so the caller can surface the real cause).
export async function uploadChunked(
  url: string,
  dest: string,
  files: UploadFile[],
  onProgress?: (p: UploadProgress) => void,
): Promise<UploadResult> {
  if (!files.length) return { written: 0, failed: [] };
  const total = files.reduce((n, f) => n + (f.file.size || 0), 0);
  const batches = batchFiles(files);
  let written = 0;
  let sent = 0; // bytes fully flushed in prior batches
  let lastError: string | undefined;
  const failed: string[] = [];

  for (const batch of batches) {
    const batchBytes = batch.reduce((n, f) => n + (f.file.size || 0), 0);
    try {
      const r = await postBatch(url, dest, batch, (loaded) =>
        onProgress?.({ loaded: sent + loaded, total }),
      );
      written += r.written ?? 0;
      if (r.failed?.length) failed.push(...r.failed);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      for (const f of batch) failed.push(f.relPath); // whole batch lost, keep going
    }
    sent += batchBytes;
    onProgress?.({ loaded: sent, total });
  }

  // Nothing at all got through → throw the real reason (proxy 413, timeout…).
  if (written === 0 && lastError) throw new Error(lastError);
  return { written, failed };
}
