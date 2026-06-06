"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import type { ContextState } from "../lib/types";

type Action = {
  label: string;
  shortcut?: string;
  danger?: boolean;
  run: () => void;
};

function Row({ a, onClose }: { a: Action; onClose: () => void }) {
  return (
    <button
      onClick={() => {
        a.run();
        onClose();
      }}
      className={cn(
        "flex w-full items-center justify-between gap-6 rounded-md px-2.5 py-1.5 text-left text-[13px] outline-none transition-colors hover:bg-primary hover:text-primary-foreground",
        a.danger && "text-destructive hover:bg-destructive hover:text-white",
      )}
    >
      <span>{a.label}</span>
      {a.shortcut && <span className="text-xs opacity-50">{a.shortcut}</span>}
    </button>
  );
}

// Floating right-click menu — glass panel positioned at the click point.
// Groups separated by a hairline. Closes on outside click / Escape.
export function FileContextMenu({
  ctx,
  hasClipboard,
  inTrash,
  onClose,
  onOpen,
  onRename,
  onNewFolder,
  onUpload,
  onUploadFolder,
  onCut,
  onCopy,
  onPaste,
  onDownload,
  onDelete,
}: {
  ctx: ContextState;
  hasClipboard: boolean;
  inTrash: boolean;
  onClose: () => void;
  onOpen: () => void;
  onRename: () => void;
  onNewFolder: () => void;
  onUpload: () => void;
  onUploadFolder: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("click", close);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  const groups: Action[][] = ctx.entry
    ? [
        [{ label: "Open", run: onOpen }, { label: "Rename", shortcut: "↵", run: onRename }],
        [
          { label: "Cut", shortcut: "⌘X", run: onCut },
          { label: "Copy", shortcut: "⌘C", run: onCopy },
          ...(hasClipboard ? [{ label: "Paste", shortcut: "⌘V", run: onPaste }] : []),
          { label: "Download", run: onDownload },
        ],
        [
          {
            label: inTrash ? "Delete Permanently" : "Move to Trash",
            shortcut: "⌫",
            danger: true,
            run: onDelete,
          },
        ],
      ]
    : [
        [
          { label: "New Folder", run: onNewFolder },
          { label: "Upload Files…", run: onUpload },
          { label: "Upload Folder…", run: onUploadFolder },
          ...(hasClipboard ? [{ label: "Paste", shortcut: "⌘V", run: onPaste }] : []),
        ],
      ];

  return (
    <div
      className="glass fixed z-[950] min-w-[190px] overflow-hidden rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-[var(--shadow-pop)]"
      style={{
        left: Math.min(ctx.x, window.innerWidth - 210),
        top: Math.min(ctx.y, window.innerHeight - 260),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {groups.map((group, gi) => (
        <div key={gi}>
          {gi > 0 && <div className="mx-1.5 my-1 h-px bg-border" />}
          {group.map((a) => (
            <Row key={a.label} a={a} onClose={onClose} />
          ))}
        </div>
      ))}
    </div>
  );
}
