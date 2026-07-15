"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// A full-width tappable action row for a grouped settings card (Reset, Test,
// Refresh, Add…) — so actions live IN the card, not in a flush button block.
// Same min-height + inset hairline as SettingsRow. tone="destructive" = iOS red
// action. Labels use AA-safe text tints in BOTH themes: --info (link blue,
// darkened for light) for the default, --destructive-text (deep red on light,
// bright on dark) for destructive — NOT the fill-tuned --primary/--destructive,
// which are sub-AA as text on the light card. Optional icon; busy → spinner.
export function SettingsActionRow({
  label,
  onClick,
  icon,
  tone = "default",
  busy = false,
  disabled = false,
  trailing,
  className,
}: {
  label: string;
  onClick?: () => void;
  icon?: ReactNode;
  tone?: "default" | "destructive";
  busy?: boolean;
  disabled?: boolean;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-slot="settings-row"
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy}
      className={cn(
        "relative flex min-h-[46px] w-full items-center gap-2.5 px-4 py-[11px] text-left text-sm font-medium transition-colors disabled:opacity-50",
        "after:absolute after:inset-x-0 after:bottom-0 after:left-4 after:h-px after:bg-border/60 last:after:hidden",
        tone === "destructive" ? "text-destructive-text hover:bg-destructive/5" : "text-info hover:bg-accent/60",
        className,
      )}
    >
      {icon && <span className="shrink-0 [&_svg]:size-4">{icon}</span>}
      <span data-slot="settings-row-label" className="flex-1">{label}</span>
      {busy ? <Loader2 role="status" aria-label="Working…" className="size-4 shrink-0 animate-spin" /> : trailing ?? null}
    </button>
  );
}
