"use client";
// audit-allow-hex: --ve-* canvas palette fallbacks (editor-stage chrome, not theme UI)

import type { Clip, Composition, MediaRef, Track, TrackKind } from "../lib/mock-timeline";
import type { ClipDragMode } from "../lib/use-clip-drag";
import type { MediaCache } from "../lib/media-cache";
import type { PanelMode } from "./toolbar";
import type { AiMessage } from "./ai-panel";
import { PreviewStage } from "./preview-stage";
import { Transport } from "./transport";
import { Timeline } from "./timeline";
import { SidePanel } from "./side-panel";
import { LayoutCanvas } from "./layout-canvas";
import { FilesPane } from "./files-pane";
import { CompactPanes } from "./compact-panes";
import { findLayout } from "../lib/layout";

// Builds the position-agnostic panes (preview / properties / timeline / files)
// and arranges them: wide = config-driven resizable split tree (LayoutCanvas)
// per the chosen workspace preset; compact (narrow pane — mobile shell OR a
// narrow desktop window) = preview stacked over a tabbed lower region.
export function ReelPanes({
  comp,
  frame,
  playing,
  monitor,
  cache,
  zoom,
  sel,
  selected,
  mode,
  aiLog,
  apply,
  dropTrack,
  layout,
  showPanel,
  compact,
  panelSheet,
  setFrame,
  setPlaying,
  setMonitor,
  setZoom,
  setShowPanel,
  setPanelSheet,
  split,
  dup,
  del,
  patchSel,
  ratio,
  runAi,
  select,
  begin,
  addTrack,
  patchTrack,
  moveTrack,
  addMedia,
}: {
  comp: Composition;
  frame: number;
  playing: boolean;
  monitor: boolean;
  cache: MediaCache;
  zoom: number;
  sel: string | null;
  selected: Clip | null;
  mode: PanelMode;
  aiLog: AiMessage[];
  apply: (fn: (c: Composition) => Composition, commit?: boolean) => void;
  dropTrack: string | null;
  layout: string;
  showPanel: boolean;
  /** Narrow pane (mobile shell OR a narrow desktop window) — container-derived. */
  compact: boolean;
  panelSheet: boolean;
  setFrame: (f: number) => void;
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setMonitor: React.Dispatch<React.SetStateAction<boolean>>;
  setZoom: (z: number) => void;
  setShowPanel: React.Dispatch<React.SetStateAction<boolean>>;
  setPanelSheet: (open: boolean) => void;
  split: () => void;
  dup: () => void;
  del: () => void;
  patchSel: (patch: Partial<Clip>) => void;
  ratio: (w: number, h: number) => void;
  runAi: (text: string) => void;
  select: (id: string | null) => void;
  begin: (e: React.PointerEvent, clip: Clip, mode: ClipDragMode) => void;
  addTrack: (kind: TrackKind) => void;
  patchTrack: (id: string, patch: Partial<Track>) => void;
  moveTrack: (id: string, dir: -1 | 1) => void;
  addMedia: (m: MediaRef, name: string) => void;
}) {
  const previewCol = (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-[var(--ve-stage,#0c0d10)]">
      <PreviewStage comp={comp} frame={frame} playing={playing} monitor={monitor} cache={cache} />
      <Transport
        frame={frame}
        duration={comp.duration}
        fps={comp.fps}
        playing={playing}
        zoom={zoom}
        hasSel={!!sel}
        monitor={monitor}
        onSeek={setFrame}
        onTogglePlay={() => setPlaying((p) => !p)}
        onSplit={split}
        onDuplicate={dup}
        onDelete={del}
        onZoom={setZoom}
        onToggleMonitor={() => setMonitor((m) => !m)}
      />
    </div>
  );
  const sidePanel = (m: PanelMode) => (
    <SidePanel
      mode={m}
      comp={comp}
      frame={frame}
      selected={selected}
      aiLog={aiLog}
      apply={apply}
      onChange={patchSel}
      onRatio={ratio}
      onSeek={setFrame}
      onDelete={del}
      onAi={runAi}
    />
  );
  const timeline = (
    <Timeline
      comp={comp}
      frame={frame}
      zoom={zoom}
      selectedId={sel}
      dropTrack={dropTrack}
      onSeek={setFrame}
      onScrub={() => setPlaying(false)}
      onSelect={select}
      onClipDrag={begin}
      onAddTrack={addTrack}
      onTrackPatch={patchTrack}
      onTrackMove={moveTrack}
    />
  );

  if (compact)
    return (
      <>
        <div className="flex min-h-0 flex-1">{previewCol}</div>
        <CompactPanes
          mode={mode}
          panelRequest={panelSheet}
          onPanelRequestDone={() => setPanelSheet(false)}
          timeline={timeline}
          panel={sidePanel}
          files={<FilesPane onAdd={addMedia} />}
        />
      </>
    );

  return (
    <div className="flex min-h-0 flex-1">
      <LayoutCanvas
        key={layout}
        root={findLayout(layout).root}
        collapsed={!showPanel}
        onCollapsedChange={(v) => setShowPanel(!v)}
        panes={{
          preview: previewCol,
          properties: <div className="flex h-full flex-col bg-card">{sidePanel(mode)}</div>,
          timeline,
          files: <FilesPane onAdd={addMedia} />,
        }}
      />
    </div>
  );
}
