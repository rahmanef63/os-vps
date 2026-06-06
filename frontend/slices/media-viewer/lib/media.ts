// Shared media helpers: editor handoff mapping + time formatting.
import type { SampleKind } from "./samples";

export type EditorTarget = { app: string; label: string };

// Which editor opens which media kind. Images → image editor (media-studio),
// timed media (video/audio) → video editor (reel-editor). Others (pdf/text)
// have no editor.
export function editorFor(kind: SampleKind): EditorTarget | null {
  if (kind === "image") return { app: "media-studio", label: "Image Editor" };
  if (kind === "video" || kind === "audio")
    return { app: "reel-editor", label: "Video Editor" };
  return null;
}

// Seconds → "m:ss".
export function fmtTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}
