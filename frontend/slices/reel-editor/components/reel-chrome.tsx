"use client";

import type { Composition, TrackKind } from "../lib/mock-timeline";
import type { MediaRef } from "../lib/mock-timeline";
import { MenuBar } from "./menu-bar";
import { Toolbar, type PanelMode } from "./toolbar";

// Top chrome: the full MenuBar + the compact Toolbar. Both surface the same
// edit/history/render/layout commands at different densities (desktop vs narrow).
export function ReelChrome({
  comp,
  mode,
  zoom,
  hasSel,
  canUndo,
  canRedo,
  layout,
  savedAt,
  compact,
  addMedia,
  ratio,
  undo,
  redo,
  split,
  dup,
  del,
  setZoom,
  togglePanel,
  setMode,
  setPanelSheet,
  setShowPanel,
  addTrack,
  startRender,
  setLayout,
  newProject,
  openSettings,
}: {
  comp: Composition;
  mode: PanelMode;
  zoom: number;
  hasSel: boolean;
  canUndo: boolean;
  canRedo: boolean;
  layout: string;
  savedAt: number | null;
  /** Narrow pane (mobile shell OR a narrow desktop window) — container-derived. */
  compact: boolean;
  addMedia: (m: MediaRef, name: string) => void;
  ratio: (w: number, h: number) => void;
  undo: () => void;
  redo: () => void;
  split: () => void;
  dup: () => void;
  del: () => void;
  setZoom: (z: number) => void;
  togglePanel: () => void;
  setMode: (m: PanelMode) => void;
  setPanelSheet: (open: boolean) => void;
  setShowPanel: React.Dispatch<React.SetStateAction<boolean>>;
  addTrack: (kind: TrackKind) => void;
  startRender: () => void;
  setLayout: (id: string) => void;
  newProject: () => void;
  openSettings: () => void;
}) {
  return (
    <>
      <MenuBar
        comp={comp}
        mode={mode}
        zoom={zoom}
        hasSel={hasSel}
        canUndo={canUndo}
        canRedo={canRedo}
        onAddMedia={addMedia}
        onRatio={ratio}
        onUndo={undo}
        onRedo={redo}
        onSplit={split}
        onDuplicate={dup}
        onDelete={del}
        onZoom={setZoom}
        onTogglePanel={togglePanel}
        onMode={(m) => {
          setMode(m);
          if (compact) setPanelSheet(true);
          else setShowPanel(true);
        }}
        onAddTrack={addTrack}
        onRender={startRender}
        layoutId={layout}
        onLayout={setLayout}
        onNewProject={newProject}
        onOpenSettings={openSettings}
        savedAt={savedAt}
      />
      <Toolbar
        comp={comp}
        mode={mode}
        canUndo={canUndo}
        canRedo={canRedo}
        onRatio={ratio}
        onUndo={undo}
        onRedo={redo}
        onTogglePanel={togglePanel}
        onRender={startRender}
      />
    </>
  );
}
