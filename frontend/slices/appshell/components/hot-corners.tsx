"use client";

import { useEffect, useRef } from "react";
import { toggleSpotlight, minimizeAll } from "../lib/store";

// macOS Hot Corners — shove the cursor into a screen corner and an action fires.
// Three invisible ~6px hit-areas pinned to the desktop corners. A short dwell
// (DWELL_MS) before firing kills accidental triggers when the pointer merely
// clips a corner on its way somewhere else; leaving the zone cancels the dwell.
//
// ponytail: hardcoded macOS defaults, NO per-corner settings UI (YAGNI). Lift
// CORNERS into a store only if a real "customize hot corners" need appears.
// ponytail: the wrapper is pointer-events-none and only the 6px squares are
// pointer-events-auto, so they never block window interaction — the cost is a
// 6px dead-zone in each active corner (the same trade macOS itself makes).
// z-[901] clears the always-present menu bar (z-[900], full-width top 30px) so
// the top-right corner still receives pointerenter; Spotlight (z-9000) covers
// them but the pointer-events-none wrapper means only the 6px squares are ever
// interactive. top-left is intentionally omitted (a no-op corner would only
// steal 6px of the menu bar for nothing).

const DWELL_MS = 120;

export function HotCorners({ onMissionControl }: { onMissionControl: () => void }) {
  // One shared dwell timer: the pointer can occupy only one corner at a time.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => clear, []);

  const arm = (run: () => void) => {
    clear();
    timer.current = setTimeout(() => {
      timer.current = null;
      run();
    }, DWELL_MS);
  };

  const corners: { key: string; pos: string; label: string; run: () => void }[] = [
    { key: "tr", pos: "right-0 top-0", label: "Mission Control", run: onMissionControl },
    { key: "bl", pos: "bottom-0 left-0", label: "Spotlight", run: toggleSpotlight },
    { key: "br", pos: "bottom-0 right-0", label: "Show desktop", run: minimizeAll },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-[901]" aria-hidden>
      {corners.map(({ key, pos, label, run }) => (
        <div
          key={key}
          title={label}
          onPointerEnter={() => arm(run)}
          onPointerLeave={clear}
          className={`pointer-events-auto absolute ${pos} h-1.5 w-1.5`}
        />
      ))}
    </div>
  );
}
