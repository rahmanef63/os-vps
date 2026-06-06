"use client";

import { useCallback } from "react";
import { toast } from "./host";
import { probeMedia } from "./media-cache";
import type { MediaRef, MediaType } from "./mock-timeline";

// One-click sample media (public /demo-media assets — real bytes, no auth).
export const SAMPLES: { label: string; url: string; type: MediaType }[] = [
  { label: "Forest photo", url: "/demo-media/photo-forest.webp", type: "image" },
  { label: "Ocean photo", url: "/demo-media/photo-ocean.webp", type: "image" },
  { label: "Sunset photo", url: "/demo-media/photo-sunset.webp", type: "image" },
  { label: "Demo clip", url: "/demo-media/clip.webm", type: "video" },
  { label: "Tone (audio)", url: "/demo-media/tone.wav", type: "audio" },
];

/** Shared import flow: probe a source for dims/duration, then drop it on the
 *  timeline. Used by the File menu (and any other import surface) so the add
 *  logic lives in exactly one place. */
export function useImport(onAdd: (m: MediaRef, name: string) => void) {
  const add = useCallback(
    async (url: string, type: MediaType, name: string) => {
      try {
        const dims = await probeMedia(url, type);
        onAdd({ url, type, ...dims }, name);
        toast(`Added ${name}`, { tone: "success" });
      } catch (e) {
        toast(e instanceof Error ? e.message : "Import failed", { tone: "error" });
      }
    },
    [onAdd],
  );

  const onFile = useCallback(
    (type: MediaType) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) void add(URL.createObjectURL(f), type, f.name);
      e.target.value = "";
    },
    [add],
  );

  return { add, onFile };
}
