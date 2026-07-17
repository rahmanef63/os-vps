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
        <span className="pointer-events-none fixed bottom-2 right-2 z-[60] rounded-full bg-primary/90 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-primary-foreground shadow">
          DEMO
        </span>
      </>
    );
  }
  return <GatedOS>{children}</GatedOS>;
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
