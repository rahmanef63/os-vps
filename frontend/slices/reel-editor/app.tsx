"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useHistory } from "./lib/history";
import { useClipDrag } from "./lib/use-clip-drag";
import { useShortcuts } from "./lib/use-shortcuts";
import { moveTrack } from "./lib/composition";
import { saveDraft } from "./lib/draft";
import { getSettings } from "./lib/settings";
import { useReelActions } from "./lib/use-reel-actions";
import { SettingsDialog } from "./components/settings-dialog";
import { MediaCache } from "./lib/media-cache";
import { type PanelMode } from "./components/toolbar";
import { ReelChrome } from "./components/reel-chrome";
import { ReelPanes } from "./components/reel-panes";
import { useLayout } from "./lib/use-layout";
import { type AiMessage } from "./components/ai-panel";
import { RenderOverlay } from "./components/render-overlay";
import { useExport } from "./lib/use-export";
import { useReelInspector } from "./lib/use-reel-inspector";
import { useIsMobile } from "./lib/host";

const HELLO: AiMessage = {
  role: "ai",
  text: "Tell me what to change. Try “make it vertical”, “fade in”, “split here”, “punch in”, or “add title Sale”.",
};

// Reel editor orchestrator: holds playhead/selection/render state, wires the
// history, drag, keyboard, and AI subsystems to the panels.
export default function ReelEditor() {
  const { comp, apply, undo, redo, canUndo, canRedo } = useHistory();
  const [frame, setFrame] = useState(30);
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<string | null>("c-intro");
  const [zoom, setZoom] = useState(3.2);
  const [mode, setMode] = useState<PanelMode>("editor");
  const [showPanel, setShowPanel] = useState(true);
  const [panelSheet, setPanelSheet] = useState(false);
  const isMobile = useIsMobile();
  const [aiLog, setAiLog] = useState<AiMessage[]>([HELLO]);
  const [cache] = useState(() => new MediaCache());
  const [monitor, setMonitor] = useState(true);
  const [layout, setLayout] = useLayout();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(frame);
  // Latest-ref mirror for drag handlers (post-render, per react-hooks/refs).
  useEffect(() => {
    frameRef.current = frame;
  });

  const selected = useMemo(() => comp.clips.find((c) => c.id === sel) ?? null, [comp.clips, sel]);
  const { dropTrack, begin } = useClipDrag(comp, apply, zoom, frameRef);
  const stopPlay = useCallback(() => setPlaying(false), []);
  const { render, startRender, closeRender } = useExport(comp, cache, stopPlay);

  // Free the cached media elements (and the hidden video host) on close.
  useEffect(() => () => cache.dispose(), [cache]);

  // Drive the monitor (speaker) tap of the shared audio graph.
  useEffect(() => cache.setMonitor(monitor), [cache, monitor]);

  // Auto-save the project draft (debounced) so a reload resumes the edit.
  useEffect(() => {
    if (!getSettings().autosave) return;
    const t = setTimeout(() => {
      saveDraft(comp);
      setSavedAt(Date.now());
    }, 800);
    return () => clearTimeout(t);
  }, [comp]);

  // Playback loop: advance the playhead at the comp frame rate, loop at the end.
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const nf = frameRef.current + dt * comp.fps;
      setFrame(nf >= comp.duration ? 0 : nf);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, comp.fps, comp.duration]);

  const { ratio, split, del, dup, addMedia, patchSel, patchTrack, newProject, addTrack, select, runAi } =
    useReelActions({ apply, sel, setSel, frameRef, mode, selected, setShowPanel, setAiLog });

  const onKey = useShortcuts({
    hasSel: !!sel,
    onUndo: undo,
    onRedo: redo,
    onSplit: split,
    onDelete: del,
    onTogglePlay: () => setPlaying((p) => !p),
  });

  useReelInspector(comp, selected, startRender);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={rootRef}
        tabIndex={0}
        onKeyDown={onKey}
        onMouseDown={() => rootRef.current?.focus({ preventScroll: true })}
        className="relative flex h-full flex-col bg-background text-foreground outline-none"
      >
        <ReelChrome
          comp={comp}
          mode={mode}
          zoom={zoom}
          hasSel={!!sel}
          canUndo={canUndo}
          canRedo={canRedo}
          layout={layout}
          savedAt={savedAt}
          isMobile={isMobile}
          addMedia={addMedia}
          ratio={ratio}
          undo={undo}
          redo={redo}
          split={split}
          dup={dup}
          del={del}
          setZoom={setZoom}
          togglePanel={() => (isMobile ? setPanelSheet(true) : setShowPanel((s) => !s))}
          setMode={setMode}
          setPanelSheet={setPanelSheet}
          setShowPanel={setShowPanel}
          addTrack={addTrack}
          startRender={startRender}
          setLayout={setLayout}
          newProject={newProject}
          openSettings={() => setSettingsOpen(true)}
        />

        <ReelPanes
          comp={comp}
          frame={frame}
          playing={playing}
          monitor={monitor}
          cache={cache}
          zoom={zoom}
          sel={sel}
          selected={selected}
          mode={mode}
          aiLog={aiLog}
          apply={apply}
          dropTrack={dropTrack}
          layout={layout}
          showPanel={showPanel}
          isMobile={isMobile}
          panelSheet={panelSheet}
          setFrame={setFrame}
          setPlaying={setPlaying}
          setMonitor={setMonitor}
          setZoom={setZoom}
          setShowPanel={setShowPanel}
          setPanelSheet={setPanelSheet}
          split={split}
          dup={dup}
          del={del}
          patchSel={patchSel}
          ratio={ratio}
          runAi={runAi}
          select={select}
          begin={begin}
          addTrack={addTrack}
          patchTrack={patchTrack}
          moveTrack={(id, dir) => apply((c) => moveTrack(c, id, dir), true)}
          addMedia={addMedia}
        />

        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        {render && (
          <RenderOverlay
            pct={render.pct}
            done={render.done}
            duration={comp.duration}
            downloadUrl={render.url}
            onClose={closeRender}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
