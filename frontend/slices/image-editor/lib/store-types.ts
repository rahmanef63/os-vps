import type Konva from "konva";
import type {
  Adjustments,
  Doc,
  DropShadow,
  Layer,
  LayerStyle,
  OuterGlow,
  Pan,
  Stroke,
  Tool,
} from "./types";
import type { Project } from "./project";
import type { DocView } from "./export";

export type Brush = { size: number; color: string; opacity: number; hardness: number };
export type { Pan };

export type Ctx = {
  doc: Doc;
  selectedId: string | null;
  selected: Layer | null;
  tool: Tool;
  zoom: number;
  pan: Pan;
  brush: Brush;
  /** Photoshop foreground/background colors. Tools paint with `fg`. */
  fg: string;
  bg: string;
  recentColors: string[];
  canUndo: boolean;
  canRedo: boolean;
  /** History revision — bumps on every change; masked-group caches off it. */
  version: number;
  /** Id of the layer whose MASK the brush currently paints (null = none). */
  maskEditId: string | null;
  stageRef: React.MutableRefObject<Konva.Stage | null>;
  /** The editor's outer DOM element — used to SCOPE global hotkeys so they only
   * fire when focus is inside this editor (not another OS window). */
  rootRef: React.MutableRefObject<HTMLDivElement | null>;
  canvasFor: (id: string, w: number, h: number) => HTMLCanvasElement;
  /** The document's current placement on the stage — passed to the exporter so
   * Save/Export render the DOC rect at 1:1 resolution, not the zoomed viewport. */
  docView: () => DocView;
  select: (id: string | null) => void;
  setTool: (t: Tool) => void;
  setZoom: (z: number) => void;
  setPan: (p: Pan) => void;
  setMaskEdit: (id: string | null) => void;
  setBrush: (b: Partial<Brush>) => void;
  /** Set foreground color (mirrors into the brush) + push to recents. */
  setFg: (c: string) => void;
  setBg: (c: string) => void;
  swapColors: () => void;
  resetColors: () => void;
  setDocSize: (w: number, h: number) => void;
  update: (id: string, patch: Partial<Layer>) => void;
  patchStyle: (id: string, patch: Partial<LayerStyle>) => void;
  patchShadow: (id: string, patch: Partial<DropShadow>) => void;
  patchGlow: (id: string, patch: Partial<OuterGlow>) => void;
  patchStroke: (id: string, patch: Partial<Stroke>) => void;
  patchAdj: (id: string, patch: Partial<Adjustments>) => void;
  addLayer: (layer: Layer, opts?: { select?: boolean }) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  reorder: (from: number, to: number) => void;
  raise: (id: string) => void;
  lower: (id: string) => void;
  /** Crop the document to (x,y,w,h): resize + shift layers + re-bake paint pixels. */
  applyCrop: (x: number, y: number, w: number, h: number) => void;
  /** Add / remove a layer mask (doc-aligned alpha buffer). */
  addMask: (id: string) => void;
  removeMask: (id: string) => void;
  /** Record a brush/eraser stroke (before+after PNG of the layer canvas). */
  recordPaint: (id: string, before: string, after: string) => void;
  /** Editable-project (doc + paint pixels) save/restore — Save/Open/autosave. */
  exportProject: () => Project;
  loadProject: (p: Project) => void;
  undo: () => void;
  redo: () => void;
};
