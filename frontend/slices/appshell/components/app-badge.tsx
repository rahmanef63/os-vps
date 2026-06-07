"use client";

import { useBadge } from "../lib/badges";

// Icon-corner badge overlay — unread count pill, attention dot, or progress
// ring. Mounted inside <AppIcon>, so every surface that renders an app icon
// (dock, taskbar, launchpad, mobile home, app switcher) shows it for free.
export function AppBadge({ appId }: { appId: string }) {
  const b = useBadge(appId);
  if (!b) return null;

  if (typeof b.progress === "number") {
    const r = 5;
    const c = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(100, b.progress));
    return (
      <span
        className="absolute right-0.5 top-0.5 z-[2] grid size-3.5 place-items-center rounded-full bg-black/55"
        aria-label={`${Math.round(clamped)}%`}
      >
        <svg viewBox="0 0 14 14" className="size-3 -rotate-90">
          <circle cx="7" cy="7" r={r} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
          <circle
            cx="7" cy="7" r={r} fill="none" stroke="white" strokeWidth="2.5"
            strokeDasharray={c} strokeDashoffset={c * (1 - clamped / 100)} strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }
  if (b.progress === null) {
    return (
      <span className="absolute right-0.5 top-0.5 z-[2] size-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
    );
  }
  if (b.count) {
    return (
      <span className="absolute right-0.5 top-0.5 z-[2] grid h-3.5 min-w-3.5 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-white shadow">
        {b.count > 99 ? "99+" : b.count}
      </span>
    );
  }
  if (b.dot) {
    return <span className="absolute right-1 top-1 z-[2] size-2 rounded-full bg-destructive shadow" />;
  }
  return null;
}
