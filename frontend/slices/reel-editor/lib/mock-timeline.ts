// Mock timeline model for the Reel editor. Pure data + helpers, no React.
// Times are in FRAMES (start/len) so keyframes line up with a comp frame rate.
// Colors are theme-token CSS vars so the timeline stays themable.

export type TrackKind = "video" | "overlay" | "text" | "audio";
export type ClipSrc = "gradient-a" | "gradient-b" | "logo" | "wave";
export type TextAnim = "rise" | "pop" | "fade";
export type XfadeType = "dissolve" | "wipe" | "slide";
export type XfadeDir = "left" | "right" | "up" | "down";
export type MediaType = "image" | "video" | "audio";

/** A real media source backing a clip (upload object-URL, demo asset, or VPS
 *  rawUrl). natW/natH are the source pixel dims (for cover-fit, 0 for audio);
 *  dur = source seconds for video/audio (clamps seek + default clip length). */
export type MediaRef = {
  url: string;
  type: MediaType;
  natW: number;
  natH: number;
  dur?: number;
};

/** Easing for the segment LEAVING a keyframe (default linear; hold = step). */
export type Ease = "linear" | "in" | "out" | "inout" | "hold";
/** A single animation keyframe: time (local frame) → value, with outgoing ease. */
export type Keyframe = { t: number; v: number; e?: Ease };
/** Per-property keyframe tracks on a clip. */
export type KeyframeMap = Partial<Record<KfProp, Keyframe[]>>;
export type KfProp = "opacity" | "scale" | "x" | "y" | "rotate";

/** Title styling (all optional — defaults keep the classic white title). */
export type TextFont = "sans" | "serif" | "mono" | "display" | "hand";
export type TextStyle = {
  font?: TextFont;
  /** size multiplier on the auto-fit size (0.5–2, default 1) */
  size?: number;
  color?: string;
  stroke?: string;
  /** stroke width relative to font size (0–0.2) */
  strokeW?: number;
  /** background box color behind each line (CSS color, may carry alpha) */
  bg?: string;
  /** drop shadow on/off (default on) */
  shadow?: boolean;
};

/** Per-clip color grading; values -100..100 (0 = neutral), vignette 0..100. */
export type Adjust = {
  exposure?: number;
  contrast?: number;
  saturation?: number;
  temp?: number;
  fade?: number;
  vignette?: number;
};

export type Clip = {
  id: string;
  /** owning track id */
  track: string;
  name: string;
  /** frames from the start of the reel */
  start: number;
  /** length in frames */
  len: number;
  /** CSS color for the clip block */
  color: string;
  kind: TrackKind;
  src?: ClipSrc;
  /** real media backing this clip; when set it draws instead of the mock src */
  media?: MediaRef;
  /** source in-point (seconds) for video trims; defaults to 0 */
  srcIn?: number;
  /** playback speed multiplier (default 1); reverse plays the source backwards */
  speed?: number;
  reverse?: boolean;
  /** audio: clip gain 0..1 (default 1), per-clip mute, fade in/out in FRAMES */
  vol?: number;
  mute?: boolean;
  fadeIn?: number;
  fadeOut?: number;
  /** auto-duck: drop this clip's level while another audio clip is playing */
  duck?: boolean;
  /** ducked level 0..1 (default 0.28) — what the clip drops TO while ducking */
  duckAmount?: number;
  /** transition duration (FRAMES) at this clip's start, over the previous
   *  same-track clip (which it overlaps by this much) */
  xfade?: number;
  /** transition style for `xfade` (default "dissolve") */
  xtype?: XfadeType;
  /** wipe/slide direction (default: wipe=left, slide=right) */
  xdir?: XfadeDir;
  text?: string;
  anim?: TextAnim;
  /** title styling for text clips */
  tstyle?: TextStyle;
  /** per-clip color grading */
  adjust?: Adjust;
  /** static base values (overridden by keyframes when present) */
  base?: Partial<Record<KfProp, number>>;
  kf?: KeyframeMap;
};

/** Tracks are LAYERS: array order = timeline display order, and index 0 (the
 *  topmost row) renders FRONTMOST. drawFrame paints back-to-front (last → first). */
export type Track = {
  id: string;
  name: string;
  kind: TrackKind;
  /** track controls: lock = no clip edits, hide = skip drawing, mute = silence */
  lock?: boolean;
  hide?: boolean;
  mute?: boolean;
};

export type Composition = {
  w: number;
  h: number;
  fps: number;
  /** total frames */
  duration: number;
  tracks: Track[];
  clips: Clip[];
};

export const TRACK_TINT: Record<TrackKind, string> = {
  video: "var(--ve-video, #ff6a9b)",
  overlay: "var(--ve-overlay, #7a5cff)",
  text: "var(--ve-text, #ffb13b)",
  audio: "var(--ve-audio, #34d39a)",
};

let _n = 0;
export const uid = (p: string) => `${p}-${(_n++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function defaultComposition(): Composition {
  const T = TRACK_TINT;
  return {
    w: 1920,
    h: 1080,
    fps: 30,
    duration: 300,
    // Top row = front layer: text over overlay over video; audio at the bottom.
    tracks: [
      { id: "t-text", name: "Text", kind: "text" },
      { id: "t-overlay", name: "Overlay", kind: "overlay" },
      { id: "t-video", name: "Video", kind: "video" },
      { id: "t-audio", name: "Audio", kind: "audio" },
    ],
    clips: [
      { id: "c-intro", track: "t-video", name: "intro.mp4", start: 0, len: 120, color: T.video, kind: "video", src: "gradient-a" },
      { id: "c-product", track: "t-video", name: "product.mov", start: 120, len: 150, color: T.video, kind: "video", src: "gradient-b" },
      { id: "c-logo", track: "t-overlay", name: "logo-anim", start: 30, len: 90, color: T.overlay, kind: "overlay", src: "logo",
        kf: { scale: [{ t: 0, v: 40 }, { t: 18, v: 115 }, { t: 30, v: 100 }], rotate: [{ t: 0, v: -12 }, { t: 30, v: 0 }] } },
      { id: "c-headline", track: "t-text", name: "Headline", start: 18, len: 84, color: T.text, kind: "text", text: "Build on your VPS", anim: "rise" },
      { id: "c-cta", track: "t-text", name: "CTA", start: 200, len: 80, color: T.text, kind: "text", text: "os-rr", anim: "pop" },
      { id: "c-music", track: "t-audio", name: "music-bed.wav", start: 0, len: 300, color: T.audio, kind: "audio", src: "wave" },
    ],
  };
}

/** Format a frame index as m:ss.cs at the comp's fps. */
export function fmtFrame(frame: number, fps: number): string {
  const safe = Math.max(0, frame) / fps;
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

/** Pixel width of the timeline content for the given zoom (px per frame). */
export const trackWidth = (duration: number, zoom: number) => duration * zoom;

/** Clips belonging to a track, ordered by start. */
export function clipsForTrack(all: Clip[], trackId: string): Clip[] {
  return all.filter((c) => c.track === trackId).sort((a, b) => a.start - b.start);
}
