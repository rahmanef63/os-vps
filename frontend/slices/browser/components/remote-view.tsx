"use client";

// The remote-browser surface: a frame <img> the user clicks/types/scrolls over.
// Frames come from the live screencast stream (or the poll fallback) via the
// hook — this component just renders `shot` and maps input into the 1280x800
// remote viewport. A small badge shows whether the live stream is connected.
import { useRef } from "react";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import { VIEW_W, VIEW_H } from "../lib/use-remote-browser";

const KEYS = new Set(["Enter", "Backspace", "Tab", "Delete", "Escape"]);

type RemoteViewProps = {
  shot: string | null;
  busy: boolean;
  live: boolean;
  onClick: (x: number, y: number) => void;
  onType: (text: string) => void;
  onKey: (key: string) => void;
  onScroll: (dy: number) => void;
  onSaveScreenshot: () => void;
  savingScreenshot: boolean;
  savedScreenshotPath: string | null;
};

export function RemoteView({
  shot,
  busy,
  live,
  onClick,
  onType,
  onKey,
  onScroll,
  onSaveScreenshot,
  savingScreenshot,
  savedScreenshotPath,
}: RemoteViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const wheelAt = useRef(0);

  // offset px → viewport px, scaled by the image's rendered size.
  const handleClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const el = imgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (VIEW_W / rect.width);
    const y = (e.clientY - rect.top) * (VIEW_H / rect.height);
    onClick(Math.round(x), Math.round(y));
  };

  const handleKey = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const k = e.key;
    if (k.length === 1) onType(k);
    else if (KEYS.has(k) || k.startsWith("Arrow")) onKey(k);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - wheelAt.current < 220) return; // throttle
    wheelAt.current = now;
    onScroll(e.deltaY);
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKey}
      onWheel={handleWheel}
      className="relative size-full overflow-hidden bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {shot ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={shot}
          alt="Remote browser viewport"
          draggable={false}
          onClick={handleClick}
          className="size-full cursor-default object-contain select-none"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
          Loading remote browser…
        </div>
      )}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-medium shadow-sm backdrop-blur">
        <span className={live ? "size-2 rounded-full bg-success" : "size-2 rounded-full bg-amber-500"} />
        <span className="text-muted-foreground">{live ? "live" : "polling"}</span>
      </div>
      {busy && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur">
          <Loader2 className="size-3 animate-spin text-primary" />
          loading…
        </div>
      )}
      <div className="absolute right-2 bottom-2 flex max-w-[min(24rem,calc(100%-1rem))] items-center gap-2">
        {savedScreenshotPath && (
          <div className="hidden items-center gap-1.5 truncate rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur @sm:flex">
            <CheckCircle2 className="size-3 shrink-0 text-success" />
            <span className="truncate">Saved {savedScreenshotPath}</span>
          </div>
        )}
        <button
          type="button"
          onClick={onSaveScreenshot}
          disabled={!shot || savingScreenshot}
          className="inline-flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-55"
          title="Save screenshot to ~/Pictures/Screenshots"
        >
          {savingScreenshot ? <Loader2 className="size-3 animate-spin text-primary" /> : <Camera className="size-3" />}
          <span>{savingScreenshot ? "saving…" : "save shot"}</span>
        </button>
      </div>
    </div>
  );
}
