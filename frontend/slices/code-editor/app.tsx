"use client";
// audit-allow-hex: VS-Code-dark editor chrome palette is the slice's design, not themable tokens.

import { useEffect, useState } from "react";
import { Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppProps } from "./lib/host";
import { usePublishInspector } from "./lib/host";
import { AppSidebar } from "./components/host-sidebar";
import { FileTree } from "./components/file-tree";
import { EditorToolbar } from "./components/editor-toolbar";
import { EditorSurface } from "./components/editor-surface";
import { TabStrip } from "./components/tab-strip";
import { StatusBar } from "./components/status-bar";
import { NewFileModal } from "./components/new-file-modal";
import { useEditor } from "./lib/use-editor";
import { baseName, langOf } from "./lib/util";

const TAB_SIZE = 2;

// Extract a `{ path }` from the cross-app window payload, if present.
function payloadPath(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "path" in payload) {
    const p = (payload as { path?: unknown }).path;
    if (typeof p === "string" && p.length) return p;
  }
  return null;
}

// Default export so os-shell can lazy-load it as a window app.
export default function CodeEditor({ payload }: AppProps) {
  const ed = useEditor();
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [pos, setPos] = useState({ ln: 1, col: 1 });

  // Open the payload path (cross-app "open this file"). Re-runs when the host
  // updates the payload on a re-open. Falls back to the seed when absent.
  const path = payloadPath(payload);
  useEffect(() => {
    if (path) ed.openPath(path);
    else ed.open("/Projects/hello.ts");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  // Cmd/Ctrl+S saves the active buffer regardless of focus within the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (ed.active) void ed.save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ed]);

  const lang = ed.active ? langOf(ed.active) : "txt";
  const lineCount = ed.active != null ? ed.value.split("\n").length : 0;

  // Surface editor state + actions to the shell AI Inspector. Re-publishes when
  // the open file, language, length, or dirty flag changes.
  usePublishInspector(
    "code-editor",
    {
      subject: ed.active ? baseName(ed.active) : "No file open",
      props: [
        { label: "File", value: ed.active ?? "—" },
        { label: "Language", value: lang },
        { label: "Lines", value: String(lineCount) },
        { label: "Unsaved", value: ed.dirty ? "yes" : "no" },
      ],
      actions: [
        { id: "save", label: "Save", run: () => void ed.save() },
        { id: "new", label: "New file", run: () => setNewOpen(true) },
      ],
      context: `Code editor with ${ed.active ?? "no file"} open (${lang}).`,
      suggestions: ["Explain this file", "Find bugs", "Add a comment header"],
    },
    [ed.active, lang, lineCount, ed.dirty],
  );

  return (
    <div className="relative flex h-full bg-[#1e1e22]">
      {/* Explorer: inline rail on wide windows, left Sheet on narrow/mobile. */}
      <AppSidebar
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        title="Explorer"
        railClassName="bg-[#16161a] border-[#2a2a30]"
        sheetClassName="bg-[#16161a] border-[#2a2a30]"
      >
        <FileTree
          rootPath="~"
          rootLabel="Explorer"
          activePath={ed.active}
          onOpenFile={(p) => { ed.open(p); setExplorerOpen(false); }}
          className="min-h-0 flex-1"
        />
      </AppSidebar>

      <div className="flex min-w-0 flex-1 flex-col">
        <TabStrip
          tabs={ed.tabs}
          active={ed.active}
          dirtyOf={(p) => ed.buffers[p] !== ed.disk[p]}
          onSelect={ed.setActive}
          onClose={ed.close}
          onNew={() => setNewOpen(true)}
        />
        <EditorToolbar
          lang={lang}
          dirty={ed.dirty}
          canSave={ed.active != null}
          onOpenExplorer={() => setExplorerOpen(true)}
          onSave={() => void ed.save()}
        />

        {ed.active != null ? (
          <EditorSurface
            value={ed.value}
            onChange={ed.edit}
            lang={lang}
            onCursor={setPos}
          />
        ) : (
          <div className="grid flex-1 place-items-center text-[#7d8590]">
            <div className="text-center">
              <div
                className="mx-auto mb-3.5 grid size-14 place-items-center rounded-2xl text-white"
                style={{ background: "linear-gradient(160deg,#3aa0ff,#1f6dff)" }}
              >
                <Code2 className="size-7" />
              </div>
              <div className="text-[15px] font-bold text-[#c7ccd4]">
                No file open
              </div>
              <p className="mx-auto mt-1.5 max-w-[320px] text-[12.5px] leading-relaxed">
                Open a file from the Explorer or start something new.
              </p>
              <div className="mt-3.5">
                <Button size="sm" onClick={() => setNewOpen(true)}>
                  New file
                </Button>
              </div>
            </div>
          </div>
        )}

        <StatusBar
          path={ed.active}
          ln={pos.ln}
          col={pos.col}
          tabSize={TAB_SIZE}
          dirty={ed.dirty}
          saveState={ed.saveState}
        />
      </div>

      <NewFileModal open={newOpen} onOpenChange={setNewOpen} onCreate={ed.create} />
    </div>
  );
}
