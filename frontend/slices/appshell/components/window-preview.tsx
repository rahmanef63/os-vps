"use client";
/* <WindowPreview> — ONE primitive for every "see your windows" surface:
   Mission Control cards, Win11 taskbar hover flyouts, iOS app switcher,
   Android recents (Phase C of SHELL-FIDELITY-PLAN.md §1.5).

   Why metadata-only (not a live mount): iOS switcher used to render the live
   <WindowContent> per card → every open app was MOUNTED TWICE while the
   switcher was open (AUDIT-2026-06-11 P1: double PTY/screencast sessions).
   Showing app icon + window title + payload subline is the cheapest fix that
   matches Win11's "icon + title" hover preview and Android's metadata card. A
   later upgrade can paint a real snapshot (canvas/img/video descendants drawn
   into a capture canvas on blur) WITHOUT touching the surfaces below — they
   only know about this primitive. */
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useWindow } from "../hooks/use-shell";
import { useApp } from "../lib/registry";
import { AppIcon } from "./app-icon";
import type { AppDescriptor, WindowState } from "../lib/types";

export type WindowPreviewAspect = "16/10" | "16/9" | "9/16" | "4/3";
export type WindowPreviewVariant = "card" | "tile" | "minimal";

export type WindowPreviewProps = {
  winId: string;
  /** CSS aspect-ratio for the preview surface. Default 16/10 (desktop card). */
  aspect?: WindowPreviewAspect;
  /** Click → focus the window (caller decides whether to also close any
   *  enclosing overlay — keeps the primitive shell-agnostic). */
  onSelect?: () => void;
  /** Show a close ✕ in the chrome. Caller's handler does the actual close. */
  onClose?: () => void;
  /** Visual variant: card = bordered with title row (desktop / mission control);
   *  tile = phone-frame card with header (iOS/Android); minimal = chrome-free
   *  thumbnail (taskbar hover flyout). */
  variant?: WindowPreviewVariant;
};

/** Pure metadata extractor — exported separately so tests (node env, no DOM)
 *  can assert the projection logic without rendering React. */
export function pickPreviewMeta(
  win: WindowState | undefined,
  app: AppDescriptor | undefined,
): { title: string; subline: string | null; gradient: string } | null {
  if (!win || !app) return null;
  return {
    title: win.title || app.title,
    subline: payloadSubline(win.payload),
    gradient: app.gradient ?? "var(--muted)",
  };
}

/** Cheapest readable subline: a file `path` / a `title` field inside payload.
 *  Anything else collapses to null (no JSON.stringify spam in the chrome). */
function payloadSubline(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const candidate = p.path ?? p.title ?? p.name ?? p.url;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

export function WindowPreview({
  winId,
  aspect = "16/10",
  onSelect,
  onClose,
  variant = "card",
}: WindowPreviewProps) {
  const win = useWindow(winId);
  const app = useApp(win?.app ?? "");
  const meta = pickPreviewMeta(win, app);
  if (!meta || !app) return null;

  const Surface = onSelect ? "button" : "div";
  return (
    <div
      data-window-preview
      data-win-id={winId}
      data-variant={variant}
      className={cn(
        "group/preview flex flex-col overflow-hidden",
        variant === "tile" && "rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]",
        variant === "card" && "rounded-[var(--shell-radius-win)] border border-border bg-card shadow-xl",
        variant === "minimal" && "rounded-[var(--shell-radius-win)] border border-border/60 bg-card/90",
      )}
      style={variant === "tile" ? { background: "var(--window-bg)" } : undefined}
    >
      {variant !== "minimal" && (
        <div
          className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2"
          style={variant === "tile" ? { background: "var(--glass-bar)" } : undefined}
        >
          <span className="size-5 shrink-0"><AppIcon app={app} /></span>
          <strong className="flex-1 truncate text-[13px] text-foreground">{meta.title}</strong>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              aria-label={`Close ${app.title}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="-mr-1 h-auto p-0 grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-foreground/10 [@media(pointer:coarse)]:size-9"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      )}
      <Surface
        type={onSelect ? "button" : undefined}
        onClick={onSelect ? (e: React.MouseEvent) => { e.stopPropagation(); onSelect(); } : undefined}
        aria-label={onSelect ? `Open ${meta.title}` : undefined}
        className={cn(
          "relative grid min-h-0 flex-1 place-items-center overflow-hidden text-left transition",
          onSelect && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          onSelect && "group-hover/preview:brightness-105",
        )}
        style={{ aspectRatio: aspect.replace("/", " / ") }}
      >
        {/* App-gradient washes the surface (low alpha) so each window reads
            as the same app even without a snapshot. */}
        <span
          className="pointer-events-none absolute inset-0"
          style={{ background: meta.gradient, opacity: 0.18 }}
        />
        <span className="relative z-[1] flex flex-col items-center gap-1.5 px-3 text-center">
          <span className="size-10"><AppIcon app={app} /></span>
          {variant === "minimal" && (
            <strong className="truncate text-[12px] font-medium text-foreground">{meta.title}</strong>
          )}
          {meta.subline && (
            <span className="line-clamp-2 max-w-[90%] text-[11px] text-muted-foreground">{meta.subline}</span>
          )}
        </span>
        {win?.minimized && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80">
            minimized
          </span>
        )}
      </Surface>
    </div>
  );
}
