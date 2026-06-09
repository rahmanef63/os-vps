"use client";

// Persist a picked wallpaper to the host fs (bounded WRITE root) and hand the
// appearance store a small same-origin URL instead of a multi-MB data URL in
// localStorage. Reuses the shared /fs/mkdir + /fs/upload + /fs/raw routes (no
// bespoke upload stack). Old data:/http wallpaperImage values keep rendering
// unchanged (imageStyle resolves them as-is). In demo / signed-out / offline
// (the host routes 401), it falls back to an inline data URL so the wallpaper
// still applies — capped so it can't blow the localStorage quota.

/** Bounded, non-sensitive target under the home WRITE root (see lib/host/paths). */
export const WALLPAPER_DIR = "~/Pictures/Wallpapers";
const HOST_MAX = 8 * 1024 * 1024; // matches the image-picker's own cap
const INLINE_MAX = 3 * 1024 * 1024; // keep the offline fallback well under quota

/** Same-origin raw-bytes URL — the session cookie authenticates it as an <img>. */
function rawUrl(path: string): string {
  return `/api/v1/fs/raw?path=${encodeURIComponent(path)}`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function safeName(file: File): string {
  const ext =
    (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "img";
  return `wp-${Date.now()}.${ext}`;
}

async function saveToHost(file: File): Promise<string> {
  // mkdir -p the target (idempotent), then upload one file into it.
  const mk = await fetch("/api/v1/fs/mkdir", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path: WALLPAPER_DIR }),
  });
  if (!mk.ok) throw new Error(`mkdir ${mk.status}`);

  const name = safeName(file);
  const fd = new FormData();
  fd.append("dest", WALLPAPER_DIR);
  fd.append("file", new File([file], name, { type: file.type }));
  const up = await fetch("/api/v1/fs/upload", { method: "POST", body: fd });
  if (!up.ok) throw new Error(`upload ${up.status}`);
  const res = (await up.json()) as { written?: number; failed?: unknown[] };
  if (!res.written || res.failed?.length) throw new Error("write rejected");
  return rawUrl(`${WALLPAPER_DIR}/${name}`);
}

// ImagePicker UploadFn: the returned string becomes the wallpaper ImageValue's
// `value` (type: "upload"). A host path-backed URL when authed; a data URL when
// the host is unreachable (demo / signed-out).
export async function uploadWallpaper(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Images only");
  if (file.size > HOST_MAX) throw new Error("Image too large (max 8 MB)");
  try {
    return await saveToHost(file);
  } catch {
    if (file.size > INLINE_MAX)
      throw new Error("Sign in to save large wallpapers (max 3 MB offline)");
    return await readAsDataUrl(file);
  }
}
