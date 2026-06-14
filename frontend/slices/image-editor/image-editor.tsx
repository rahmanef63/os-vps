"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EditorProvider, useEditor } from "./lib/store";
import { blankDoc, createLayer } from "./lib/model";
import { loadAutosave, saveAutosave } from "./lib/project";
import { stageToDataURL } from "./lib/export";
import { imageEditorConfig } from "./config";
import { ToolRail } from "./components/tool-rail";
import { MenuBar } from "./components/menu-bar";
import { ProjectLoader, ProjectLoadError } from "./components/project-loader";
import { ToolOptionsBar } from "./components/tool-options-bar";
import { SidePanel } from "./components/side-panel";
import { MobileShell } from "./components/mobile-shell";
import { ConfirmRemoveLayerProvider } from "./components/confirm-remove-layer";
import { useKeyboard } from "./hooks/use-keyboard";
import { useIsMobile } from "./hooks/use-is-mobile";
import type { Doc } from "./lib/types";

// The Konva stage touches `window`/`canvas` at import time, so it is loaded
// client-only (no SSR) — the rest of the chrome renders normally.
const EditorStage = dynamic(
  () => import("./components/stage/editor-stage").then((m) => m.EditorStage),
  { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-muted-foreground">Loading canvas…</div> },
);

export type ImageEditorProps = {
  /** Optional image to open on mount (data URL / object URL / remote URL). */
  initialImage?: string;
  /**
   * Optional URL to a saved document/project JSON to load on mount — either a
   * full Project ({v:1,doc,paint}) or a bare Doc ({width,height,layers}). This
   * is how a headless-CRUD'd `.doc.json` (built via /api/v1/editor/exec) renders
   * in the REAL editor: "render = open in os-vps".
   */
  projectSrc?: string;
  /**
   * Optional persistence sink — when set, the editor debounce-saves the current
   * Doc to it (the back half of the round-trip: edits in the real editor flow
   * back to the file a headless CRUD opened). Injected so the slice stays
   * backend-agnostic; the consumer wires it to its file write.
   */
  onSaveDoc?: (doc: Doc) => void;
  /** Optional starting canvas size; defaults to config (1080×1080). */
  width?: number;
  height?: number;
  /** Fired by the Save button with a PNG data URL. Omit to hide Save. */
  onSave?: (dataUrl: string) => void;
  /** Fired by the "Save As" button with a PNG data URL — consumers show a
   * destination picker. Omit to hide Save As. */
  onSaveAs?: (dataUrl: string) => void;
  /** File → Close menu item (consumer closes the window). Omit to hide. */
  onClose?: () => void;
  /** Reports unsaved-changes state so the consumer can guard window close. */
  onDirty?: (dirty: boolean) => void;
  /** Hands the consumer an imperative API (render PNG, mark clean) on mount. */
  onReady?: (api: EditorApi) => void;
  /**
   * Container-first layout override: the host passes its PANE width verdict
   * (e.g. a 390px desktop window) so the compact layout isn't keyed off the
   * viewport alone. Omitted (standalone use) → falls back to useIsMobile().
   */
  compact?: boolean;
  className?: string;
}

/** Imperative handle exposed via `onReady` — lets a consumer render the canvas
 * (e.g. to save on close) and clear the dirty flag after saving. */
export type EditorApi = { exportPng: () => string | null; markSaved: () => void };;

// Desktop layout: left tool rail · canvas · right dock (adjust top, layers bottom).
function DesktopShell({ stage, onSave, onSaveAs, onClose }: { stage: React.ReactNode; onSave?: (d: string) => void; onSaveAs?: (d: string) => void; onClose?: () => void }) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      <MenuBar onSave={onSave} onSaveAs={onSaveAs} onClose={onClose} />
      <ToolOptionsBar />
      <div className="flex min-h-0 flex-1">
        <ToolRail />
        <div className="min-w-0 flex-1">{stage}</div>
        <SidePanel />
      </div>
    </div>
  );
}

// Autosave the editable project to localStorage (debounced); restore it on mount
// when the editor opened blank (no initialImage) so a reload doesn't lose work.
function useAutosave(autoRestore: boolean, saveDoc?: (doc: Doc) => void, ready = true) {
  const { doc, exportProject, loadProject } = useEditor();
  useEffect(() => {
    if (!autoRestore) return;
    const a = loadAutosave();
    if (a) loadProject(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    // File-backed (opened from a path): debounce-save the Doc back to it — but
    // only once the initial load finished, so the blank starter never clobbers
    // the file. Otherwise fall back to the localStorage autosave.
    if (saveDoc) {
      if (!ready) return;
      const t = setTimeout(() => saveDoc(doc), 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => saveAutosave(exportProject()), 800);
    return () => clearTimeout(t);
  }, [doc, exportProject, saveDoc, ready]);
}

// Picks desktop vs mobile layout; both share ONE EditorStage element + provider.
type ShellProps = {
  onSave?: (d: string) => void;
  onSaveAs?: (d: string) => void;
  onClose?: () => void;
  onDirty?: (dirty: boolean) => void;
  onReady?: (api: EditorApi) => void;
  autoRestore: boolean;
  saveDoc?: (doc: Doc) => void;
  ready?: boolean;
  compact?: boolean;
};

function Shell({ onSave, onSaveAs, onClose, onDirty, onReady, autoRestore, saveDoc, ready, compact }: ShellProps) {
  useKeyboard();
  useAutosave(autoRestore, saveDoc, ready);
  const autoMobile = useIsMobile();
  const mobile = compact ?? autoMobile;
  const { version, canUndo, stageRef, rootRef, docView } = useEditor();
  // Dirty = history moved past the last save. Derived (no effect-driven
  // setState): loadProject/autosave don't push history so opening a file never
  // trips it; api.markSaved() pins savedVersion to the current version.
  const [savedVersion, setSavedVersion] = useState(0);
  const dirty = canUndo && version > savedVersion;
  const versionRef = useRef(version);
  useEffect(() => {
    versionRef.current = version;
  });
  useEffect(() => { onDirty?.(dirty); }, [dirty, onDirty]);
  useEffect(() => {
    onReady?.({
      exportPng: () => { const s = stageRef.current; return s ? stageToDataURL(s, { format: "png", view: docView() }) : null; },
      markSaved: () => setSavedVersion(versionRef.current),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const stage = <EditorStage />;
  return (
    <TooltipProvider delayDuration={300}>
      {/* Focusable editor root: hotkey hooks gate on `rootRef.contains(activeElement)`
          so Delete/Space/tool keys only fire when THIS editor holds focus. Pulling
          focus here on pointer-down (unless already inside) keeps that check true
          while interacting with the canvas (which doesn't focus a DOM node). */}
      <div
        ref={rootRef}
        tabIndex={-1}
        className="h-full w-full outline-none"
        onPointerDownCapture={() => {
          const root = rootRef.current;
          if (root && !root.contains(document.activeElement)) root.focus({ preventScroll: true });
        }}
      >
        {mobile ? <MobileShell stage={stage} onSave={onSave} onSaveAs={onSaveAs} /> : <DesktopShell stage={stage} onSave={onSave} onSaveAs={onSaveAs} onClose={onClose} />}
      </div>
    </TooltipProvider>
  );
}

// Standalone, self-contained image editor. Drops into any height-bearing box.
export function ImageEditor({ initialImage, projectSrc, onSaveDoc, width, height, onSave, onSaveAs, onClose, onDirty, onReady, compact, className }: ImageEditorProps) {
  const initialDoc = useMemo<Doc>(() => {
    const d = blankDoc(width ?? imageEditorConfig.defaultWidth, height ?? imageEditorConfig.defaultHeight);
    if (initialImage) d.layers.push(createLayer("image", { name: "Image", src: initialImage }));
    return d;
  }, [initialImage, width, height]);
  // When loading a doc from a URL, gate the save-back until the load LANDS. A
  // failed load leaves `ready` false forever so autosave never writes the blank
  // starter over the user's file; the error surfaces inline instead.
  const [ready, setReady] = useState(!projectSrc);
  const [loadError, setLoadError] = useState<string | null>(null);
  const onLoaded = useCallback((ok: boolean, error?: string) => {
    if (ok) { setReady(true); setLoadError(null); }
    else setLoadError(error ?? "Could not open project");
  }, []);

  return (
    <div className={cn("relative h-full w-full", className)}>
      <EditorProvider initialDoc={initialDoc}>
        <ConfirmRemoveLayerProvider>
          {projectSrc && <ProjectLoader src={projectSrc} onDone={onLoaded} />}
          <Shell onSave={onSave} onSaveAs={onSaveAs} onClose={onClose} onDirty={onDirty} onReady={onReady} autoRestore={!initialImage && !projectSrc} saveDoc={onSaveDoc} ready={ready} compact={compact} />
        </ConfirmRemoveLayerProvider>
      </EditorProvider>
      {loadError && <ProjectLoadError message={loadError} />}
    </div>
  );
}
