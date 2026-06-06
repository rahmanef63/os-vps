"use client";

import * as React from "react";

export interface FilePickerHandle {
  /** Open the native file chooser. */
  open: () => void;
}

export interface FilePickerProps {
  /** Receives the chosen files. The input is reset afterwards, so picking the
   *  same file twice fires again. */
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  /** Folder picker (webkitdirectory). Picked files keep `webkitRelativePath`. */
  directory?: boolean;
  disabled?: boolean;
  className?: string;
  /** When provided, children render inside a clickable + drag-droppable zone —
   *  replaces the hand-rolled `<label><input type="file" hidden/></label>`
   *  pattern. Omit to drive the picker imperatively via the `open()` handle. */
  children?: React.ReactNode;
  "aria-label"?: string;
}

/**
 * Headless file-picker primitive — owns the single native `<input type="file">`
 * so slice/feature code never hand-rolls a raw file input (audit:templates
 * forbids it). Two ergonomics:
 *   • imperative — `const ref = useRef<FilePickerHandle>(null); ref.current?.open()`
 *   • zone — pass `children` to get a clickable + droppable drop area.
 */
export const FilePicker = React.forwardRef<FilePickerHandle, FilePickerProps>(
  function FilePicker(
    { onFiles, accept, multiple, directory, disabled, className, children, ...aria },
    ref,
  ) {
    const inputRef = React.useRef<HTMLInputElement>(null);

    const open = React.useCallback(() => {
      if (!disabled) inputRef.current?.click();
    }, [disabled]);

    React.useImperativeHandle(ref, () => ({ open }), [open]);

    const emit = (list: FileList | null) => {
      const files = Array.from(list ?? []);
      if (files.length) onFiles(files);
    };

    // webkitdirectory / directory are non-standard attrs — spread as raw.
    const dirAttrs = directory
      ? ({ webkitdirectory: "", directory: "" } as Record<string, string>)
      : {};

    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          hidden
          disabled={disabled}
          onChange={(e) => {
            emit(e.target.files);
            e.target.value = "";
          }}
          {...dirAttrs}
        />
        {children != null && (
          <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={aria["aria-label"]}
            aria-disabled={disabled || undefined}
            className={className}
            onClick={open}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                open();
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              emit(e.dataTransfer.files);
            }}
          >
            {children}
          </div>
        )}
      </>
    );
  },
);
