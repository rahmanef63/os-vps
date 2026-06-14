"use client";

import type { ChangeEvent, Ref } from "react";
import type { UploadFile } from "../lib/host";

// Hidden file picker → binary-safe {relPath, file} batch. `directory` renders a
// folder picker (webkitdirectory), where relPath = the file's path within the
// chosen folder. The parent triggers it via ref.current.click().
export function UploadInput({
  onFiles,
  directory,
  ref,
}: {
  onFiles: (files: UploadFile[]) => void;
  directory?: boolean;
  ref?: Ref<HTMLInputElement>;
}) {
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!picked.length) return;
    onFiles(picked.map((file) => ({ relPath: file.webkitRelativePath || file.name, file })));
  };
  // webkitdirectory is non-standard; spread as a raw attribute to satisfy TS.
  const dirAttrs = directory ? ({ webkitdirectory: "", directory: "" } as Record<string, string>) : {};
  return <input ref={ref} type="file" multiple hidden onChange={onChange} {...dirAttrs} />;
}
