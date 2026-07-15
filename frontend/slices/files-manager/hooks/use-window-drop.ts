"use client";

import { useState, type DragEvent } from "react";
import type { UseDnd } from "./use-dnd";

// Window-wide drop zone so a dragged file/folder lands anywhere in the app
// (not just on the grid) — without this, a drop on the toolbar/sidebar/empty
// padding falls through to the browser, which just opens the folder.
export function useWindowDrop(dnd: UseDnd, path: string) {
  const [dragActive, setDragActive] = useState(false);
  const isFileDrag = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const onDragOver = (e: DragEvent) => {
    if (!isFileDrag(e)) return; // ignore internal item moves at the window level
    dnd.onDragOver(e, path);
    setDragActive(true);
  };
  const onDragLeave = (e: DragEvent) => {
    if (e.relatedTarget === null) setDragActive(false); // left the window entirely
  };
  const onDrop = (e: DragEvent) => {
    setDragActive(false);
    if (isFileDrag(e)) dnd.onDrop(e, path);
  };
  // Inner drop targets (grid/folder/sidebar) call e.stopPropagation() to route
  // the upload/move, which also stops the bubble onDrop above from ever clearing
  // the overlay. A capture-phase reset runs top-down BEFORE any stopPropagation,
  // so the overlay always clears; the bubble onDrop still handles toolbar/padding
  // drops. Side-effect-free (only flips the flag) so it can't double-fire uploads.
  const onDropCapture = () => setDragActive(false);
  return { dragActive, onDragOver, onDragLeave, onDrop, onDropCapture };
}
