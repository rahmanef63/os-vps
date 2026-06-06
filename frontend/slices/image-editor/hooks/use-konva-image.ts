"use client";

import { useEffect, useState } from "react";
import { loadImage } from "../lib/konva-helpers";

// Load an image src → HTMLImageElement for <KonvaImage image=…>. Returns null
// until loaded. crossOrigin is set (in loadImage) so filters/export don't taint.
export function useKonvaImage(src: string | undefined): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let alive = true;
    if (!src) {
      setImg(null);
      return;
    }
    loadImage(src)
      .then((el) => alive && setImg(el))
      .catch(() => alive && setImg(null));
    return () => {
      alive = false;
    };
  }, [src]);
  return img;
}
