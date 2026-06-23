import { useCallback } from "react";
import type Konva from "konva";
import type { Doc } from "./types";

// An editable project = the document + every paint layer's pixels (PNG data URL,
// keyed by layer id). This is what Save/Load and autosave persist — distinct from
// a flat PNG export, because it round-trips back into a fully editable canvas.
export type Project = { v: 1; doc: Doc; paint: Record<string, string> };

export function buildProject(doc: Doc, canvases: Map<string, HTMLCanvasElement>): Project {
  const paint: Record<string, string> = {};
  for (const l of doc.layers) {
    if (l.kind !== "paint") continue;
    const c = canvases.get(l.id);
    if (c) paint[l.id] = c.toDataURL();
  }
  return { v: 1, doc, paint };
}

// Restore paint pixels for the loaded doc into the canvas map, then redraw.
export function restorePaint(
  project: Project,
  canvasFor: (id: string, w: number, h: number) => HTMLCanvasElement,
  redraw: () => void,
) {
  const { doc, paint } = project;
  for (const [id, url] of Object.entries(paint)) {
    const c = canvasFor(id, doc.width, doc.height);
    const ctx = c.getContext("2d");
    const img = new window.Image();
    img.onload = () => {
      ctx?.clearRect(0, 0, c.width, c.height);
      ctx?.drawImage(img, 0, 0);
      redraw();
    };
    img.src = url;
  }
  redraw();
}

export function downloadProject(project: Project, name = "project") {
  const blob = new Blob([JSON.stringify(project)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.ie.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function parseProject(text: string): Project | null {
  try {
    const p = JSON.parse(text);
    if (p && p.v === 1 && p.doc && Array.isArray(p.doc.layers)) return p as Project;
  } catch {
    /* ignore */
  }
  return null;
}

const KEY = "image-editor:autosave:v1";
export function saveAutosave(project: Project) {
  try {
    localStorage.setItem(KEY, JSON.stringify(project));
  } catch {
    /* quota / serialization — ignore */
  }
}
export function loadAutosave(): Project | null {
  try {
    const t = localStorage.getItem(KEY);
    return t ? parseProject(t) : null;
  } catch {
    return null;
  }
}

// Save/restore the editable project, factored out of the store to keep it lean.
export function useProjectIO(deps: {
  doc: Doc;
  canvases: React.MutableRefObject<Map<string, HTMLCanvasElement>>;
  canvasFor: (id: string, w: number, h: number) => HTMLCanvasElement;
  setDoc: (d: Doc) => void;
  setSelected: (id: string | null) => void;
  stageRef: React.MutableRefObject<Konva.Stage | null>;
}) {
  const { doc, canvases, canvasFor, setDoc, setSelected, stageRef } = deps;
  const exportProject = useCallback(() => buildProject(doc, canvases.current), [doc, canvases]);
  const loadProject = useCallback((p: Project) => {
    setDoc(p.doc);
    setSelected(p.doc.layers.at(-1)?.id ?? null);
    restorePaint(p, canvasFor, () => stageRef.current?.draw());
  }, [setDoc, setSelected, canvasFor, stageRef]);
  return { exportProject, loadProject };
}
