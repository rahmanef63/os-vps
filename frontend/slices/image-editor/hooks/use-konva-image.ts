"use client";

import { useEffect, useState } from "react";
import { loadImage } from "../lib/image-io";

// Load an image src → HTMLImageElement for <KonvaImage image=…>. Returns null
// until loaded. crossOrigin is set (in loadImage) so filters/export don't taint.
export function useKonvaImage(src: string | undefined): HTMLImageElement | null {
  // Keyed by src: a different (or missing) src derives back to null while the
  // new image loads — no synchronous setState reset in the effect
  // (react-hooks/set-state-in-effect).
  const [loaded, setLoaded] = useState<{ src: string; el: HTMLImageElement | null } | null>(null);
  useEffect(() => {
    if (!src) return;
    let alive = true;
    loadImage(src)
      .then((el) => alive && setLoaded({ src, el }))
      .catch(() => alive && setLoaded({ src, el: null }));
    return () => {
      alive = false;
    };
  }, [src]);
  return src && loaded?.src === src ? loaded.el : null;
}
