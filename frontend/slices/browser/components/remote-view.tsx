"use client";

// The remote-browser surface: a screenshot <img> the user clicks/types/scrolls
// over. Mouse offsets map into the 1280x800 remote viewport; keys forward to
// /type (printable) or /key (Enter/Backspace/Tab/Arrow*). Wheel is throttled.
import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { VIEW_W, VIEW_H } from "../lib/use-remote-browser";

// Live MJPEG stream of the caller's tab (CDP screencast). Native <img> playback —
// smooth + event-driven. Falls back to the polled screenshot if it errors.
const STREAM_SRC = "/api/v1/browser/screencast";

const KEYS = new Set(["Enter", "Backspace", "Tab", "Delete", "Escape"]);

type RemoteViewProps = {
  shot: string | null;
  busy: boolean;
  onClick: (x: number, y: number) => void;
  onType: (text: string) => void;
  onKey: (key: string) => void;
  onScroll: (dy: number) => void;
};

export function RemoteView({ shot, busy, onClick, onType, onKey, onScroll }: RemoteViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const wheelAt = useRef(0);
  // Prefer the live stream; drop to the polled screenshot if it fails to load.
  const [live, setLive] = useState(true);
  const src = live ? STREAM_SRC : shot;

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
      className="absolute inset-0 overflow-hidden bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={src}
          alt="Remote browser viewport"
          draggable={false}
          onClick={handleClick}
          onError={() => live && setLive(false)}
          className="size-full cursor-default object-contain select-none"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
          Loading remote browser…
        </div>
      )}
      {busy && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur">
          <Loader2 className="size-3 animate-spin text-primary" />
          loading…
        </div>
      )}
    </div>
  );
}
