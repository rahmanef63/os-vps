"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import type { FsEntry, UploadFile } from "../lib/host";
import { readDropEntries } from "../lib/read-drop";

// Drag-and-drop with two modes, distinguished at drop time:
//  • INTERNAL move — drag the current selection onto a folder / sidebar / crumb.
//  • EXTERNAL upload — drag files AND folders in from the OS; structure kept.
// `dropTarget` is the hovered path (drop highlight). Moves go to `onMove`,
// uploads to `onUpload`.
export function useDnd(
  selected: Set<string>,
  selectOne: (name: string) => void,
  onMove: (names: string[], destPath: string) => void,
  onUpload: (files: UploadFile[], destPath: string) => void,
) {
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const dragNames = useRef<string[]>([]);

  const onDragStart = useCallback(
    (e: DragEvent, entry: FsEntry) => {
      const names = selected.has(entry.name) ? [...selected] : [entry.name];
      if (!selected.has(entry.name)) selectOne(entry.name);
      dragNames.current = names;
      e.dataTransfer.effectAllowed = "move";
      try {
        e.dataTransfer.setData("text/plain", names.join(","));
      } catch {
        /* some browsers block setData outside user gesture */
      }
    },
    [selected, selectOne],
  );

  const isExternal = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

  // Accept the drop when it's an internal move OR an external file/folder drag.
  const onDragOver = useCallback((e: DragEvent, destPath: string) => {
    const internal = dragNames.current.length > 0;
    if (!internal && !isExternal(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = internal ? "move" : "copy";
    setDropTarget((cur) => (cur === destPath ? cur : destPath));
  }, []);

  const onDragLeave = useCallback((destPath: string) => {
    setDropTarget((cur) => (cur === destPath ? null : cur));
  }, []);

  const onDrop = useCallback(
    (e: DragEvent, destPath: string) => {
      e.preventDefault();
      e.stopPropagation();
      setDropTarget(null);
      const names = dragNames.current;
      dragNames.current = [];
      if (names.length) {
        onMove(names, destPath);
        return;
      }
      // External: read entries synchronously (here, before await) then upload.
      if (isExternal(e)) {
        void readDropEntries(e.dataTransfer).then((files) => {
          if (files.length) onUpload(files, destPath);
        });
      }
    },
    [onMove, onUpload],
  );

  const reset = useCallback(() => {
    dragNames.current = [];
    setDropTarget(null);
  }, []);

  return { dropTarget, onDragStart, onDragOver, onDragLeave, onDrop, reset };
}

export type UseDnd = ReturnType<typeof useDnd>;
