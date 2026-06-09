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
  return { dragActive, onDragOver, onDragLeave, onDrop };
}

export type UseWindowDrop = ReturnType<typeof useWindowDrop>;
