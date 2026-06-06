"use client";

import { useCallback, useRef, useState } from "react";
import type { Composition } from "./mock-timeline";
import type { MediaCache } from "./media-cache";
import { renderToWebM } from "./render";
import { toast, setActivity, clearActivity } from "./host";

export type RenderState = { pct: number; done: boolean; url?: string } | null;

// Owns the offline render → downloadable .webm flow: progress state, the abort
// controller, the blob-URL lifecycle, and the Dynamic Island activity. `onStart`
// lets the caller pause playback before a render kicks off.
export function useExport(comp: Composition, cache: MediaCache, onStart: () => void) {
  const [render, setRender] = useState<RenderState>(null);
  const abortRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);

  // Start a real client-side canvas render → downloadable .webm.
  const startRender = useCallback(async () => {
    onStart();
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setRender({ pct: 0, done: false });
    // Surface progress to the Dynamic Island so it's visible from anywhere.
    setActivity("reel:render", { appId: "reel-editor", label: "Rendering video", progress: 0, detail: "0%" });
    try {
      const blob = await renderToWebM(
        comp,
        cache,
        (pct) => {
          setRender({ pct, done: false });
          setActivity("reel:render", {
            appId: "reel-editor",
            label: "Rendering video",
            progress: pct,
            detail: `${Math.round(pct)}%`,
          });
        },
        ac.signal,
      );
      if (ac.signal.aborted) return clearActivity("reel:render");
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setRender({ pct: 100, done: true, url });
      setActivity("reel:render", { appId: "reel-editor", label: "Render complete", progress: 100, tone: "done" });
      setTimeout(() => clearActivity("reel:render"), 4000);
      toast("Render complete", { tone: "success" });
    } catch (e) {
      clearActivity("reel:render");
      if (!ac.signal.aborted) {
        toast(e instanceof Error ? e.message : "Render failed", { tone: "error" });
        setRender(null);
      }
    }
  }, [comp, cache, onStart]);

  // Close overlay: cancel any in-flight render and free the blob URL.
  const closeRender = useCallback(() => {
    abortRef.current?.abort();
    clearActivity("reel:render");
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setRender(null);
  }, []);

  return { render, startRender, closeRender };
}
