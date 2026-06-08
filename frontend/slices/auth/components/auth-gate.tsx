"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAppearance } from "@/lib/appearance";
import { IS_DEMO } from "@/lib/demo";
import { LoginScreen } from "./login-screen";
import { useSession } from "../lib/use-session";

// Gates the OS. Demo build → open straight to the (mock) OS with a small badge.
// Otherwise: login when signed out, spinner while resolving, OS when in.
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

// Real auth path — session cookie verified by /api/auth/me (no Convex).
function GatedOS({ children }: { children: ReactNode }) {
  const { status, refresh } = useSession();
  if (status === "loading") return <Splash />;
  if (status === "out") return <LoginScreen onAuthed={refresh} />;
  return <>{children}</>;
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
