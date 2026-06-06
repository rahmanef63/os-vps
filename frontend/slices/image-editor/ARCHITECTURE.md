# image-editor — architecture (stable; build new features onto this, don't rewrite)

A Konva-based, Photoshop-style raster editor. Backend-agnostic: image in/out via
props (`initialImage` / `onSave`); background removal runs in-browser. One React
context (`EditorProvider`) holds all state; the Konva `<Stage>` renders it.

## Folder layout (single responsibility per file, hard cap 200 LOC — refactor when over)

```
image-editor/
├── image-editor.tsx        Public entry. <ImageEditor>. Picks Desktop/Mobile shell,
│                           mounts EditorProvider, dynamic-imports the stage (ssr:false).
├── index.ts                Public barrel (the only import surface for consumers).
├── config.ts               Cosmetic defaults.
│
├── lib/                    PURE state/model/helpers — NO JSX, NO Konva component imports
│   ├── types.ts            Doc · Layer · LayerKind · LayerStyle · Adjustments · Tool · Pan
│   ├── model.ts            createLayer / blankDoc / presets
│   ├── store.tsx           EditorProvider + useEditor (THE context). Thin — delegates to:
│   ├── layer-mutators.ts   update/patchStyle/patchShadow/patchGlow/patchStroke/patchAdj
│   ├── doc-ops.ts          add/remove/duplicate/reorder/raise/lower/setDocSize/applyCrop
│   ├── history.ts          unified undo/redo timeline (doc steps + paint-pixel deltas)
│   ├── project.ts          save/load/.json + autosave + useProjectIO
│   ├── mask.ts             mask alpha-buffer helpers + useMaskOps
│   ├── konva-helpers.ts    blend/shadow/glow/stroke/fill/filters → Konva props
│   ├── export.ts           stage → PNG/JPG/WebP
│   └── bg-removal.ts       @imgly wrapper (lazy)
│
├── hooks/                  React hooks (browser/Konva-aware, no business logic)
│   ├── use-konva-image.ts · use-stage-view.ts (zoom/pan/pinch/fit)
│   └── use-keyboard.ts · use-is-mobile.ts
│
├── components/stage/       Everything rendered INSIDE <Stage> (Konva nodes)
│   ├── editor-stage.tsx    The Stage + the LAYER RENDER LOOP (see below) + overlays
│   ├── layer-node.tsx      One non-adjustment layer (image/text/shape/paint) + effects
│   ├── paint-layer.tsx     Paint layer (brush/eraser on an offscreen canvas)
│   ├── masked-group.tsx    Wraps a layer through its mask (cached group + destination-in)
│   ├── mask-surface.tsx    Brush-on-mask capture surface (when editing a mask)
│   ├── filtered-group.tsx  Adjustment layer: filters everything below (cached group)
│   ├── crop-overlay.tsx · text-overlay.tsx · zoom-hud.tsx (DOM overlays / HUD)
│
├── components/panels/      Right-dock panels + the Layers UI
│   ├── side-panel.tsx ……… NO: side-panel + mobile-shell live in components/ (chrome)
│   ├── adjust-panel · layer-styles-panel · transform-panel · export-panel
│   ├── layers-panel · layers-header · layers-footer · layer-actions-menu · layer-thumb
│   └── text-props · shape-props
│
└── components/             Chrome: top-bar · tool-rail · tool-options-bar · side-panel · mobile-shell
```

## The layer render model (editor-stage) — the load-bearing decision

Layers are an ordered array: `layers[0]` = bottom, last = top (Konva z-order). The
stage renders them with an ACCUMULATOR so "affect-below" features compose cleanly:

```
acc = []
for layer in doc.layers (bottom → top):
  if layer.kind === "adjustment":   acc = [ <FilteredGroup adj>{...acc}</FilteredGroup> ]
  else:                             acc.push(<LayerNode layer/>)   // masked-group wraps if layer.mask
render acc
```

- **Adjustment layer** → wraps everything accumulated below it in a cached, filtered
  group. Stacking adjustments compounds. Layers added ABOVE are unaffected.
- **Layer mask** → handled inside `LayerNode` (wraps that one layer in a masked group).
- **Re-cache trigger**: cached groups (mask + adjustment) re-cache off the store's
  `version` (history revision), which bumps on every edit/undo. No bespoke revisions.

## Conventions (so additions don't require rewrites)

- New canvas behaviour → a component in `components/stage/`, composed into the
  accumulator or as an overlay; never inline a big block into editor-stage.
- New panel → `components/panels/`, added as a tab in `side-panel`/`mobile-shell`.
- New state/op → a hook in `lib/` wired into `store.tsx` (keep store thin).
- Files over 200 LOC get split (e.g. transform-panel → text-props/shape-props).
- shadcn primitives only; on lift to os-vps, divergent ones (slider/tabs) are
  vendored under `ui/` and imports rewritten (see the lift notes).
