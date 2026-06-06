"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Simulated transport for the offline samples (no real media bytes). Drives a
// normalized position 0..1 via rAF while playing; loops back to 0 at the end.
export function usePlayback(duration: number) {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0); // 0..1
  const raf = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(raf.current);
      return;
    }
    last.current = performance.now();
    const loop = (t: number) => {
      const dt = (t - last.current) / 1000;
      last.current = t;
      setPos((p) => {
        const n = p + dt / (duration || 1);
        return n >= 1 ? 0 : n;
      });
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, duration]);

  const toggle = useCallback(() => setPlaying((p) => !p), []);
  const seek = useCallback((v: number) => setPos(Math.max(0, Math.min(1, v))), []);

  return { playing, pos, toggle, seek };
}
