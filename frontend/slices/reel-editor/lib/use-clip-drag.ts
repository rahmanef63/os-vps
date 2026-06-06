// Pointer-drag handler for moving / trimming clips, with cross-track drop
// (same-kind lanes), source-bounded trims, and edge snapping to the playhead +
// other clip edges. Returns the drop-target track id and a `begin` callback.

"use client";

import { useCallback, useState, type RefObject } from "react";
import { type Clip, type Composition } from "./mock-timeline";
import { patchClip, moveToTrack, clampTrim } from "./composition";

export type ClipDragMode = "move" | "resize" | "trim-in";

export function useClipDrag(
  comp: Composition,
  apply: (fn: (c: Composition) => Composition, commit?: boolean) => void,
  zoom: number,
  frameRef: RefObject<number>,
) {
  const [dropTrack, setDropTrack] = useState<string | null>(null);

  const begin = useCallback(
    (e: React.PointerEvent, clip: Clip, mode: ClipDragMode) => {
      apply((c) => c, true); // snapshot for undo
      const startX = e.clientX;
      const origStart = clip.start;
      const origLen = clip.len;
      const origIn = clip.srcIn ?? 0;
      const speed = clip.speed ?? 1;
      const fps = comp.fps;
      const dur = clip.media?.type !== "image" ? clip.media?.dur : undefined;
      let target = clip.track;

      // Snap a frame value to the playhead or any other clip's start/end.
      const snap = (frame: number, c: Composition): number => {
        const tol = Math.max(1, Math.round(7 / zoom));
        let best = frame;
        let bd = tol + 1;
        const consider = (edge: number) => {
          const d = Math.abs(edge - frame);
          if (d < bd) { bd = d; best = edge; }
        };
        consider(Math.round(frameRef.current ?? 0));
        for (const cl of c.clips) {
          if (cl.id === clip.id) continue;
          consider(cl.start);
          consider(cl.start + cl.len);
        }
        return bd <= tol ? best : frame;
      };

      const move = (ev: PointerEvent) => {
        const d = Math.round((ev.clientX - startX) / zoom);

        if (mode === "resize") {
          apply((c) => {
            const end = snap(origStart + origLen + d, c);
            const want = Math.min(end - origStart, c.duration - origStart);
            return patchClip(c, clip.id, { len: clampTrim(dur, fps, origIn, Math.max(6, want), speed).len });
          });
          return;
        }

        if (mode === "trim-in") {
          apply((c) => {
            const start = Math.max(0, snap(origStart + d, c));
            const dd = start - origStart; // frames the head moved
            const len = origLen - dd;
            const t = clampTrim(dur, fps, origIn + (dd / fps) * speed, len, speed);
            // keep the OUT point fixed: re-derive start from the clamped len
            const realStart = origStart + origLen - t.len;
            return patchClip(c, clip.id, { start: Math.max(0, realStart), len: t.len, srcIn: t.srcIn });
          });
          return;
        }

        // move
        apply((c) => {
          const raw = Math.max(0, Math.min(c.duration - origLen, origStart + d));
          const byStart = snap(raw, c);
          const byEnd = snap(raw + origLen, c) - origLen;
          const start = Math.max(0, Math.min(c.duration - origLen, Math.abs(byEnd - raw) < Math.abs(byStart - raw) ? byEnd : byStart));
          return patchClip(c, clip.id, { start });
        });
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const lane = el?.closest<HTMLElement>("[data-track]");
        if (lane && lane.dataset.kind === clip.kind) {
          target = lane.dataset.track!;
          setDropTrack(target !== clip.track ? target : null);
        } else {
          setDropTrack(null);
        }
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        setDropTrack(null);
        if (mode === "move" && target && target !== clip.track)
          apply((c) => moveToTrack(c, clip.id, target));
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [apply, zoom, comp.fps, frameRef],
  );

  return { dropTrack, begin };
}
