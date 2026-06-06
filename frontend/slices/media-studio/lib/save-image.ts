"use client";

// Host-side image saving for Media Studio (the os-vps consumer of the portable
// image-editor slice). The editor stays backend-agnostic and just hands us a PNG
// data URL; here we convert it to the chosen format and write it to a VPS folder
// via the binary-safe upload route, remembering the user's choice in localStorage.

export type SaveFormat = "png" | "jpeg" | "webp";
export type SavePrefs = { dir: string; format: SaveFormat; quality: number; remember: boolean };

export const DEFAULT_DIR = "~/Pictures/Studio";
const KEY = "studio.save.v1";
const DEFAULTS: SavePrefs = { dir: DEFAULT_DIR, format: "png", quality: 92, remember: false };
const EXT: Record<SaveFormat, string> = { png: "png", jpeg: "jpg", webp: "webp" };

export function loadSavePrefs(): SavePrefs {
  try {
    const t = localStorage.getItem(KEY);
    return t ? { ...DEFAULTS, ...(JSON.parse(t) as Partial<SavePrefs>) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSavePrefs(p: SavePrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* quota — ignore */
  }
}

// PNG data URL → Blob of the requested format (re-encode via canvas for jpeg/webp).
async function toBlob(dataUrl: string, format: SaveFormat, quality: number): Promise<Blob> {
  if (format === "png") return await (await fetch(dataUrl)).blob();
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("image decode failed"));
    img.src = dataUrl;
  });
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext("2d")?.drawImage(img, 0, 0);
  return await new Promise<Blob>((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), `image/${format}`, quality / 100),
  );
}

// Write the rendered image into a host folder. Same-origin → the session cookie
// authenticates; the route confines writes to the allowed roots. Returns the path.
export async function saveImageToHost(
  dataUrl: string,
  opts: { dir: string; name: string; format: SaveFormat; quality: number },
): Promise<string> {
  const blob = await toBlob(dataUrl, opts.format, opts.quality);
  const fileName = `${opts.name}.${EXT[opts.format]}`;
  const fd = new FormData();
  fd.append("dest", opts.dir);
  fd.append("file", new File([blob], fileName, { type: `image/${opts.format}` }));
  const r = await fetch("/api/v1/fs/upload", { method: "POST", body: fd });
  if (!r.ok) {
    const err = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `save failed (${r.status})`);
  }
  const res = (await r.json()) as { failed?: unknown[] };
  if (res.failed?.length) throw new Error("write rejected — folder outside the allowed roots?");
  return `${opts.dir.replace(/\/$/, "")}/${fileName}`;
}

// Timestamped name for silent (remembered) saves so they never overwrite.
export function autoName(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `studio-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
