"use client";

import { SAFE, type SafePlatform } from "../lib/masks";

// Non-interactive overlay marking where platform UI (captions, action buttons)
// covers the design. Tinted insets + a dashed central "keep content" box.
export function SafeArea({ platform }: { platform: SafePlatform }) {
  const s = SAFE[platform];
  const zone: React.CSSProperties = {
    position: "absolute",
    background: "rgba(255,70,70,.13)",
  };
  return (
    <div className="pointer-events-none absolute inset-0 z-[60]">
      <div style={{ ...zone, top: 0, left: 0, right: 0, height: `${s.top}%` }} />
      <div
        style={{ ...zone, bottom: 0, left: 0, right: 0, height: `${s.bottom}%` }}
      />
      <div
        style={{
          ...zone,
          top: `${s.top}%`,
          bottom: `${s.bottom}%`,
          left: 0,
          width: `${s.left}%`,
        }}
      />
      <div
        style={{
          ...zone,
          top: `${s.top}%`,
          bottom: `${s.bottom}%`,
          right: 0,
          width: `${s.right}%`,
        }}
      />
      <div
        className="absolute rounded-sm border border-dashed border-white/90"
        style={{
          top: `${s.top}%`,
          bottom: `${s.bottom}%`,
          left: `${s.left}%`,
          right: `${s.right}%`,
        }}
      />
      <span
        className="absolute rounded-sm bg-black/55 px-1.5 py-px font-mono text-[9px] text-white"
        style={{
          top: `calc(${s.top}% + 3px)`,
          left: `calc(${s.left}% + 3px)`,
        }}
      >
        {platform} safe
      </span>
    </div>
  );
}
