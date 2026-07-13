"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared widget-card primitives — used by the mobile Today page AND the
// desktop wallpaper-layer widget stack.

export function gb(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

// className lets an interactive widget opt back into pointer events — the desktop
// stack wrapper is pointer-events-none, so Notes/Quicklinks pass "pointer-events-auto".
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("rounded-2xl border border-white/15 p-3.5 text-foreground backdrop-blur-xl", className)}
      style={{ background: "var(--glass-menu)" }}
    >
      {children}
    </div>
  );
}

export function Row({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground" />
      <span className="text-[12.5px] font-semibold">{label}</span>
      <span className="ml-auto text-[12.5px] font-bold tabular-nums">{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}
