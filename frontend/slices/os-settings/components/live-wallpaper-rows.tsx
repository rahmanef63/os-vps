"use client";
/* Live-wallpaper picker rows (Settings → Wallpaper). Two sources:
   — "From code": TSX wallpapers registered via registerWallpaper() (os-shell
     ships Drift + Starfield; any project can add its own).
   — "Custom HTML": paste a page; it renders behind the desktop in a SANDBOXED
     iframe (allow-scripts only — no cookies, no parent DOM, no authed /api).
   "Receives clicks" makes the empty desktop click-through so the wallpaper
   works as an interactive site; windows/dock/menus stay on top and clickable. */
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { LIVE_WALLPAPER_HTML_MAX, useAppearance, type LiveWallpaper } from "@/lib/appearance";
import { useWallpapers } from "@/features/os-shell";
import { SettingsRow as Row } from "@/features/shell-settings";

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className={cn("h-8 rounded-full px-3 text-xs", !active && "bg-card/60")}
    >
      {label}
    </Button>
  );
}

export function LiveWallpaperRows() {
  const { tweaks, setTweaks } = useAppearance();
  const lw = tweaks.liveWallpaper;
  const registered = useWallpapers();
  const [draft, setDraft] = useState(lw?.kind === "html" ? lw.html : "");
  const [editing, setEditing] = useState(false);
  const set = (v: LiveWallpaper | null) => setTweaks({ liveWallpaper: v });
  const tooBig = draft.length > LIVE_WALLPAPER_HTML_MAX;

  return (
    <>
      <Row label="Live wallpaper">
        <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
          <Chip active={!lw} label="Off" onClick={() => { set(null); setEditing(false); }} />
          {registered.map((d) => (
            <Chip
              key={d.id}
              active={lw?.kind === "component" && lw.id === d.id}
              label={d.label}
              onClick={() => { set({ kind: "component", id: d.id, interactive: d.interactive }); setEditing(false); }}
            />
          ))}
          <Chip active={lw?.kind === "html" || editing} label="Custom HTML" onClick={() => setEditing(true)} />
        </div>
      </Row>

      {(editing || lw?.kind === "html") && (
        <div className="rounded-2xl border border-border bg-card/45 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="size-3.5" />
            Paste a full HTML page (scripts allowed). It runs in a sandboxed frame: no cookies, no OS access.
          </p>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            placeholder={"<!doctype html>\n<style>body{margin:0;background:#0b0e1a}</style>\n<canvas id=c></canvas>\n<script>…</script>"}
            className="h-32 font-mono text-xs"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!draft.trim() || tooBig}
              onClick={() => set({ kind: "html", html: draft, interactive: lw?.interactive ?? true })}
            >
              Apply
            </Button>
            {lw?.kind === "html" && (
              <Button type="button" size="sm" variant="ghost" onClick={() => { set(null); setEditing(false); }}>
                Remove
              </Button>
            )}
            <span className={cn("ml-auto text-[10px]", tooBig ? "text-destructive" : "text-muted-foreground")}>
              {Math.ceil(draft.length / 1024)} / {LIVE_WALLPAPER_HTML_MAX / 1024} KB
            </span>
          </div>
        </div>
      )}

      {lw && (
        <Row label="Wallpaper receives clicks">
          <div className="flex items-center justify-end gap-2">
            <span className="text-[11px] text-muted-foreground">Empty desktop passes clicks to it</span>
            <Switch
              checked={!!lw.interactive}
              onCheckedChange={(interactive) => set({ ...lw, interactive })}
            />
          </div>
        </Row>
      )}
    </>
  );
}
