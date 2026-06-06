"use client";
// audit-allow-hex: --ve-* canvas palette fallbacks (editor-stage chrome, not theme UI)

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Keyframe } from "../lib/mock-timeline";

// A diamond toggle for adding/removing a keyframe at the playhead.
export function KeyDiamond({ filled, dim }: { filled: boolean; dim: boolean }) {
  return (
    <svg viewBox="0 0 12 12" className="size-3">
      <path
        d="M6 .8l5.2 5.2L6 11.2.8 6z"
        fill={filled ? "var(--accent)" : "none"}
        stroke={dim ? "var(--muted-foreground)" : "var(--accent)"}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Prev/next keyframe navigation arrows.
export function KeyNav({
  keys,
  local,
  onSeek,
}: {
  keys: Keyframe[];
  local: number;
  onSeek: (t: number) => void;
}) {
  const prev = [...keys].reverse().find((k) => k.t < local);
  const next = keys.find((k) => k.t > local);
  const btn = (on: boolean) =>
    cn(
      "size-4 gap-0 rounded bg-secondary p-0 text-[11px] font-normal leading-none text-muted-foreground hover:bg-secondary hover:text-muted-foreground",
      !on && "opacity-40",
    );
  return (
    <span className="flex gap-0.5">
      <Button type="button" variant="ghost" className={btn(!!prev)} disabled={!prev} onClick={() => prev && onSeek(prev.t)}>
        ‹
      </Button>
      <Button type="button" variant="ghost" className={btn(!!next)} disabled={!next} onClick={() => next && onSeek(next.t)}>
        ›
      </Button>
    </span>
  );
}

// Small graph of keyframes along the clip duration, with a local playhead.
export function KeyLane({
  keys,
  len,
  local,
  onSeek,
}: {
  keys: Keyframe[];
  len: number;
  local: number;
  onSeek: (t: number) => void;
}) {
  return (
    <div
      className="relative mt-1.5 h-3 cursor-pointer rounded bg-secondary"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onSeek(Math.round(((e.clientX - r.left) / r.width) * len));
      }}
    >
      <div
        className="absolute inset-y-0 w-px bg-[var(--ve-playhead,#ff3b30)]"
        style={{ left: `${(Math.max(0, Math.min(len, local)) / len) * 100}%` }}
      />
      {keys.map((k, i) => (
        <Button
          key={i}
          type="button"
          variant="ghost"
          title={`${(k.t / 30).toFixed(2)}s · ${k.v}`}
          onClick={(e) => {
            e.stopPropagation();
            onSeek(k.t);
          }}
          className="absolute top-1/2 size-2 min-w-0 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[1px] bg-primary p-0 ring-2 ring-card hover:bg-primary"
          style={{ left: `${(k.t / len) * 100}%` }}
        />
      ))}
    </div>
  );
}
