# reel-editor — video timeline editor

In-browser NLE slice. Everything renders through ONE Canvas-2D path
(`lib/draw.ts` `drawFrame`/`drawClip`) used by both the live preview and the
realtime `MediaRecorder` exporter, so what you see is what renders.

## Capabilities

- **Media**: image/video/audio clips (uploads, VPS file picker, samples);
  filmstrip thumbnails + real waveforms on the timeline.
- **Tracks are layers**: top timeline row renders frontmost; ▲▼ reorder,
  lock/hide/mute per track.
- **Editing**: drag/move/resize/trim-in, split, duplicate, snapping,
  per-clip speed (0.25–4×) + reverse, source-bounded trims.
- **Audio**: per-clip volume/mute/fades, auto-duck (adjustable level),
  streaming audio graph (no PCM in memory), preview monitoring toggle,
  real mixed audio in the export.
- **Transitions**: dissolve / wipe / slide with direction, via clip overlap.
- **Animation**: keyframes (opacity/scale/x/y/rotation) with easing, lane
  graphs, prev/next nav + one-click In/Out presets.
- **Looks**: text styling (fonts, stroke, box, shadow + preset grid) and
  per-clip color grading (exposure/contrast/saturation/temperature/fade/
  vignette) — both baked into preview AND export.
- **Workspace**: config-driven resizable layout presets (`lib/layout.ts`),
  a project-files quick-import pane (default folder
  `~/reel-projects/session`, configurable), menu bar, settings dialog,
  draft auto-save to localStorage.

## Integration seam

All host coupling goes through **`lib/host.ts`** (shell services, fs api,
responsive hook). To lift this slice into another app, replace that one file
with your own implementations. UI primitives come from `@/components/ui/*`
(shadcn) and `@/lib/utils` (`cn`).

## Files

- `lib/` — model (`mock-timeline.ts`), draw path, media cache + audio graph,
  renderer, keyframes/easing, layout tree, settings, draft, import, thumbs.
- `components/` — menu bar, toolbar, preview, transport, timeline + clip
  blocks, tabbed inspector (`clip-tab-*`), files pane, dialogs.
