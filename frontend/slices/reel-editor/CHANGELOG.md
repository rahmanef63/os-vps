# Changelog — reel-editor

## 0.3.0 — 2026-06-04

- Tracks are layers: top row renders frontmost; ▲▼ reorder; lock/hide/mute.
- Pro upgrade: draft auto-save + restore, filmstrip thumbnails, tabbed
  inspector (Clip/Text/Audio/Animate/Adjust), text styling + preset grid,
  per-clip color grading + vignette, animation In/Out presets, settings
  dialog (image duration, autosave, project folder).
- Workspace: config-driven resizable layout presets incl. files-pane
  layouts (Content left/right); project-files quick-import pane with
  go-to-folder + copy-path; custom composition size (W×H + swap).
- Host coupling consolidated into `lib/host.ts` (rr-lift seam).

## 0.2.0 — 2026-06-03

- Real media + unified canvas draw path (preview == export).
- Realtime WebM export with real mixed audio (streaming graph, low RAM).
- Per-clip volume/fade/duck, trim in/out, speed/reverse, transitions
  (dissolve/wipe/slide + direction), keyframe easing, waveforms,
  drag-scrub playhead, VPS file-picker import.

## 0.1.0 — 2026-05-29

- Initial mock timeline editor (gradient clips, keyframes, fake render).
