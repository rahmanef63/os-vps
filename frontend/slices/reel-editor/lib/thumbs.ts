"use client";

// Filmstrip thumbnails for timeline clip blocks. Generated once per url on an
// offscreen <video>/<img>, downscaled to tiny JPEG data-URLs and cached
// module-wide (cheap: 8 × 64×36 ≈ a few KB per video).

import { useEffect, useState } from "react";

const TW = 64;
const TH = 36;
const COUNT = 8;
const cache = new Map<string, string[] | Promise<string[]>>();

function coverInto(ctx: CanvasRenderingContext2D, el: CanvasImageSource, sw: number, sh: number) {
  if (!sw || !sh) return;
  const r = Math.max(TW / sw, TH / sh);
  ctx.drawImage(el, (TW - sw * r) / 2, (TH - sh * r) / 2, sw * r, sh * r);
}

async function videoThumbs(url: string): Promise<string[]> {
  const v = document.createElement("video");
  v.muted = true;
  v.preload = "auto";
  v.crossOrigin = "anonymous";
  v.src = url;
  await new Promise<void>((res, rej) => {
    v.onloadedmetadata = () => res();
    v.onerror = () => rej(new Error("video load failed"));
  });
  const dur = v.duration && Number.isFinite(v.duration) ? v.duration : 1;
  const cv = document.createElement("canvas");
  cv.width = TW;
  cv.height = TH;
  const ctx = cv.getContext("2d")!;
  const out: string[] = [];
  for (let i = 0; i < COUNT; i++) {
    await new Promise<void>((res) => {
      v.onseeked = () => res();
      v.currentTime = Math.min(Math.max(0, dur - 0.05), ((i + 0.5) / COUNT) * dur);
    });
    coverInto(ctx, v, v.videoWidth, v.videoHeight);
    out.push(cv.toDataURL("image/jpeg", 0.55));
  }
  v.removeAttribute("src");
  v.load();
  return out;
}

async function imageThumb(url: string): Promise<string[]> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("image load failed"));
  });
  const cv = document.createElement("canvas");
  cv.width = TW;
  cv.height = TH;
  coverInto(cv.getContext("2d")!, img, img.naturalWidth, img.naturalHeight);
  return [cv.toDataURL("image/jpeg", 0.6)];
}

/** Thumbnails for a media url (8 frames for video, 1 for image); null while
 *  generating or when the source can't be decoded. */
export function useThumbs(url: string | undefined, type: "image" | "video" | undefined): string[] | null {
  const [thumbs, setThumbs] = useState<string[] | null>(() => {
    const hit = url ? cache.get(url) : undefined;
    return Array.isArray(hit) ? hit : null;
  });

  useEffect(() => {
    if (!url || !type) return;
    let dead = false;
    const hit = cache.get(url);
    const p = Array.isArray(hit)
      ? Promise.resolve(hit)
      : (hit ??
        (() => {
          const made = (type === "video" ? videoThumbs(url) : imageThumb(url)).then(
            (t) => (cache.set(url, t), t),
            () => (cache.set(url, []), [] as string[]),
          );
          cache.set(url, made);
          return made;
        })());
    void p.then((t) => !dead && setThumbs(t));
    return () => {
      dead = true;
    };
  }, [url, type]);

  return thumbs?.length ? thumbs : null;
}
