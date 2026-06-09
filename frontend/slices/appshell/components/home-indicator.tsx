"use client";

// iPhone-style home indicator with gestures. In a standalone PWA the OS bottom
// gesture is suppressed, so the pill owns it:
//   • tap            → app switcher
//   • swipe up quick → home
//   • swipe up + hold→ app switcher
//   • swipe left/rt  → previous / next open app
// Pointer-based (no lib); thresholds tuned for thumbs. touch-action:none so a
// vertical swipe here is never stolen by page scroll.
export function HomeIndicator({
  light = true,
  onHome,
  onSwitcher,
  onSwitchApp,
}: {
  light?: boolean;
  onHome: () => void;
  onSwitcher: () => void;
  onSwitchApp?: (dir: -1 | 1) => void;
}) {
  const onPointerDown = (e: React.PointerEvent) => {
    const sx = e.clientX;
    const sy = e.clientY;
    const t0 = performance.now();
    let moved = false;
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    const move = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - sx) > 8 || Math.abs(ev.clientY - sy) > 8) moved = true;
    };
    const up = (ev: PointerEvent) => {
      cleanup();
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      const dt = performance.now() - t0;
      if (!moved) return onSwitcher(); // tap
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) return onSwitchApp?.(dx > 0 ? 1 : -1);
      if (dy < -36) return dt > 320 ? onSwitcher() : onHome(); // up: quick = home, hold = switcher
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      className="flex justify-center pt-[5px] [touch-action:none]"
      style={{ paddingBottom: "calc(7px + var(--sai-bottom))" }}
      onPointerDown={onPointerDown}
    >
      <button
        type="button"
        aria-label="Home — swipe up for home, hold for app switcher"
        className="flex items-center justify-center px-12 py-1.5"
      >
        <span
          className="h-[5px] w-[134px] rounded-full"
          style={{ background: light ? "rgba(255,255,255,.75)" : "rgba(0,0,0,.3)" }}
        />
      </button>
    </div>
  );
}
