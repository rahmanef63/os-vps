// Per-element playhead stepping for MediaCache.syncPlayback — drives one
// <video>/<audio> element to the right source time + play/pause/seek state for a
// comp frame, honouring speed/reverse. Kept free-standing so the cache class
// stays small. No audio routing here (that's AudioGraph); this is the visual +
// transport side only.

import type { Clip } from "./mock-timeline";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Source time (seconds) for a clip at a comp frame, honouring speed/reverse. */
export function srcTime(clip: Clip, frame: number, fps: number) {
  const speed = clip.speed ?? 1;
  const inS = clip.srcIn ?? 0;
  const local = (frame - clip.start) / fps;
  const t = clip.reverse ? inS + (clip.len / fps) * speed - local * speed : inS + local * speed;
  const dur = clip.media?.dur;
  return clamp(t, 0, dur ? dur - 0.05 : t);
}

/** Step one media element to the frame: play/seek when active, pause otherwise.
 *  Videos advance whenever `playing`; audio only when `sound`. */
export function stepElement(
  el: HTMLMediaElement,
  c: Clip,
  frame: number,
  fps: number,
  playing: boolean,
  sound: boolean,
  isVideo: boolean,
) {
  const active = frame >= c.start && frame < c.start + c.len;
  const target = srcTime(c, frame, fps);
  const reverse = !!c.reverse;
  const advancing = active && playing && (isVideo || sound);
  if (advancing && reverse) {
    // No negative playbackRate in browsers → seek per frame (video visual).
    if (!el.paused) el.pause();
    if (Math.abs(el.currentTime - target) > 0.02) el.currentTime = target;
  } else if (advancing) {
    el.playbackRate = Math.min(16, Math.max(0.0625, c.speed ?? 1));
    if (el.paused) {
      el.currentTime = target;
      void el.play().catch(() => {});
    } else if (Math.abs(el.currentTime - target) > 0.34) {
      el.currentTime = target;
    }
  } else {
    if (!el.paused) el.pause();
    if (active && !playing && isVideo && Math.abs(el.currentTime - target) > 0.05)
      el.currentTime = target;
  }
}
