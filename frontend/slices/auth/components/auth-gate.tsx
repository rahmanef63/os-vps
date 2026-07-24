"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAppearance } from "@/lib/appearance";
import { IS_DEMO } from "@/lib/demo";
import { useSession } from "../lib/use-session";

// The shell is PUBLIC: anyone can open it and browse on mock data — no sign-in
// wall. Sign-in is admin-only and unlocks live host access (files/terminal/
// monitor); every /api host route enforces the session server-side, so a
// signed-out visitor is confined to mock (see lib/os-api). Sign-in lives inside
// the shell (Settings → Server). This gate now only shows a brief splash while
// the session resolves (avoids a mock→live flash for the owner) + the DEMO badge.
export function AuthGate({ children }: { children: ReactNode }) {
  if (IS_DEMO) {
    return (
      <>
        {children}
        <DemoModeOverlay />
      </>
    );
  }
  return <GatedOS>{children}</GatedOS>;
}

function DemoModeOverlay() {
  const tasks = [
    "Open System Monitor",
    "Browse a sample project",
    "Open Terminal",
    "Switch to mobile view",
    "Ask Alfa about a mock server warning",
  ];
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] bg-amber-500 px-3 py-1.5 text-center text-xs font-bold text-amber-950 shadow">
        Demo Mode — Mock data only. No real server is connected.
      </div>
      <div className="pointer-events-none fixed bottom-3 left-3 z-[60] max-w-[min(22rem,calc(100vw-1.5rem))] rounded-lg border border-border/70 bg-popover/95 p-3 text-xs text-popover-foreground shadow-lg backdrop-blur">
        <div className="mb-1 font-semibold">Guided demo</div>
        <ol className="space-y-0.5">
          {tasks.map((task, i) => (
            <li key={task}>{i + 1}. {task}</li>
          ))}
        </ol>
      </div>
    </>
  );
}

function GatedOS({ children }: { children: ReactNode }) {
  const { status } = useSession();
  if (status === "loading") return <Splash />;
  return <>{children}</>; // signed-in AND signed-out → the shell (mock when out)
}

function Splash() {
  const { tweaks } = useAppearance();
  return (
    <div className="relative grid h-dvh w-screen place-items-center">
      <div
        className={cn(!tweaks.wallpaperStyle && `wp-${tweaks.wallpaper === "auto" ? "aurora" : tweaks.wallpaper}`, "absolute inset-0 -z-10 bg-cover bg-center")}
        style={tweaks.wallpaperStyle}
      />
      <Loader2 className="size-6 animate-spin text-white drop-shadow" />
    </div>
  );
}
