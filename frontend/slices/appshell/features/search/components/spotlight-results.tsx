"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useViewportWindow } from "../../../lib/use-viewport-window";
import { type Command } from "../lib";

// Past this many results we switch to a windowed render: at ~44px per row
// (px-3 py-2 + size-7 icon), 80 rows ≈ 3.5k px of off-screen DOM, which is the
// point where the keystroke→paint loop in <input> starts to stutter on
// mid-range laptops. Below that, render-all wins on simplicity.
const SPOTLIGHT_VIRTUALIZE_THRESHOLD = 80;
const SPOTLIGHT_ROW_HEIGHT = 44;

// Result list — render-all for short result sets, viewport-windowed for big
// ones (>80 hits). Same DOM shape both paths so styling/keyboard nav behave
// identically; only the slice + spacer change.
export function ResultList({
  id,
  results,
  selIdx,
  onHover,
  onPick,
}: {
  id: string;
  results: Command[];
  selIdx: number;
  onHover: (i: number) => void;
  onPick: (i: number) => void;
}) {
  const scrollRef = useRef<HTMLUListElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const enabled = results.length > SPOTLIGHT_VIRTUALIZE_THRESHOLD;
  const win = useViewportWindow(results, {
    rowHeight: SPOTLIGHT_ROW_HEIGHT,
    overscan: 4,
    containerRef: spacerRef,
  });
  const slice = enabled ? results.slice(win.start, win.end) : results;
  const baseIndex = enabled ? win.start : 0;
  return (
    <ul
      ref={scrollRef}
      id={id}
      role="listbox"
      aria-label="Spotlight results"
      className="max-h-80 overflow-y-auto border-t border-border p-2"
    >
      {enabled ? (
        <div ref={spacerRef} style={{ height: win.totalHeight, position: "relative" }}>
          <div style={{ position: "absolute", top: win.offsetTop, left: 0, right: 0 }}>
            {slice.map((c, j) => (
              <ResultRow
                key={c.id}
                cmd={c}
                index={baseIndex + j}
                selected={baseIndex + j === selIdx}
                onHover={onHover}
                onPick={onPick}
              />
            ))}
          </div>
        </div>
      ) : (
        slice.map((c, i) => (
          <ResultRow
            key={c.id}
            cmd={c}
            index={i}
            selected={i === selIdx}
            onHover={onHover}
            onPick={onPick}
          />
        ))
      )}
    </ul>
  );
}

function ResultRow({
  cmd,
  index,
  selected,
  onHover,
  onPick,
}: {
  cmd: Command;
  index: number;
  selected: boolean;
  onHover: (i: number) => void;
  onPick: (i: number) => void;
}) {
  return (
    <li
      id={`spotlight-option-${index}`}
      role="option"
      aria-selected={selected}
    >
      <Button
        type="button"
        variant="ghost"
        tabIndex={-1}
        onMouseMove={() => onHover(index)}
        onClick={() => onPick(index)}
        className={cn(
          "h-auto flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm",
          selected ? "bg-primary/15 text-foreground" : "text-foreground/80",
        )}
      >
        <span
          className="grid size-7 shrink-0 place-items-center rounded-md text-xs font-bold text-white"
          style={{ background: cmd.app?.gradient ?? "var(--accent)" }}
        >
          {cmd.app ? null : cmd.hint === "Folder" ? "📁" : "⚡"}
        </span>
        <span className="flex-1 truncate">{cmd.label}</span>
        <span className="text-[11px] text-muted-foreground">{cmd.hint}</span>
      </Button>
    </li>
  );
}
