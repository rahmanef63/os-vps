"use client";
// audit-allow-hex: preview chrome matches the VS-Code-dark editor palette.

import { useEffect, useMemo, useState } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildPreview } from "../lib/build-preview";
import { baseName } from "../lib/util";

// Live preview. The active file runs in a SANDBOXED iframe — sandbox is
// "allow-scripts" WITHOUT allow-same-origin, so the page is an opaque origin: it
// can't read our session cookie, reach the authed /api/v1, or touch the parent
// DOM. Deps load from esm.sh; JSX/TS transpile in-browser (see build-preview.ts).
export function PreviewPane({ path, code }: { path: string; code: string }) {
  const [debounced, setDebounced] = useState(code);
  const [nonce, setNonce] = useState(0);

  // Re-run 600ms after edits settle — transpile + CDN fetch is too heavy to do
  // on every keystroke. A manual re-run bumps `nonce` to force a fresh frame.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(code), 600);
    return () => clearTimeout(t);
  }, [code]);

  // `nonce` deliberately omitted: a manual re-run remounts the iframe via
  // key={nonce}, which reloads the (identical) srcDoc from scratch on its own.
  const srcDoc = useMemo(() => buildPreview(path, debounced), [path, debounced]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-white">
      <header className="flex h-8 shrink-0 items-center gap-2 border-b border-[#2a2a30] bg-[#16161a] px-2.5 text-[11px] text-[#9aa0aa]">
        <span className="truncate font-medium">Preview · {baseName(path)}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Re-run preview"
          aria-label="Re-run preview"
          onClick={() => setNonce((n) => n + 1)}
          className="ml-auto size-6 rounded p-0 text-[#9aa0aa] hover:bg-[#2a2a30] hover:text-white [@media(pointer:coarse)]:size-8"
        >
          <RotateCw className="size-3.5" />
        </Button>
      </header>
      <iframe
        key={nonce}
        title="Code preview"
        sandbox="allow-scripts allow-modals"
        referrerPolicy="no-referrer"
        srcDoc={srcDoc}
        className="min-h-0 w-full flex-1 border-0 bg-white"
      />
    </div>
  );
}
