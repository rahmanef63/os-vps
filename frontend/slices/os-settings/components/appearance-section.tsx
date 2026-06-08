"use client";

import { Monitor, Palette, Smartphone, Wallpaper as WallpaperIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ACCENT_OPTIONS,
  DEVICE_OPTIONS,
  STYLE_OPTIONS,
  WALLPAPER_OPTIONS,
  useAppearance,
  wallpaperLabel,
  type Device,
  type Dir,
  type Wallpaper,
} from "@/lib/appearance";
import { ImagePickerButton, imageStyle, type ImageValue } from "@/features/image-picker";
import { setShell, shellsForSurface, useShellPrefs, type ShellId } from "@/features/os-shell";
import { SettingsRow as Row, SettingsSection as Section } from "@/features/shell-settings";

const UPLOAD_MAX = 3 * 1024 * 1024;

async function uploadAsDataUrl(file: File): Promise<string> {
  if (file.size > UPLOAD_MAX) throw new Error("Image too large (max 3 MB)");
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function ChoiceCard({
  active,
  label,
  hint,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  hint?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-20 rounded-2xl border bg-card/60 p-2.5 text-left transition hover:bg-accent/70",
        active ? "border-ring ring-2 ring-ring/40" : "border-border",
      )}
    >
      {children}
      <span className="mt-2 block text-xs font-semibold leading-tight">{label}</span>
      {hint && <span className="mt-0.5 block text-[10px] leading-tight text-muted-foreground">{hint}</span>}
    </button>
  );
}

function WallpaperPreview({ wallpaper, custom }: { wallpaper: Wallpaper; custom: ImageValue | null }) {
  if (custom) {
    return <span className="block h-16 rounded-xl bg-cover bg-center ring-1 ring-border" style={imageStyle(custom)} />;
  }
  return <span className={cn("block h-16 rounded-xl ring-1 ring-border", `wp-${wallpaper}`)} />;
}

export function AppearanceSection() {
  const { tweaks, setTweaks, setWallpaperImage } = useAppearance();
  const prefs = useShellPrefs();
  const customWallpaper = tweaks.wallpaperImage;
  const shellOpts = (surface: "desktop" | "mobile") => shellsForSurface(surface);

  return (
    <div className="space-y-5">
      <Section icon={<Palette />} title="Style & accent">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {STYLE_OPTIONS.map((style) => (
            <ChoiceCard
              key={style.value}
              active={tweaks.dir === style.value}
              label={style.label}
              hint={style.hint}
              onClick={() => setTweaks({ dir: style.value as Dir })}
            >
              <span className={cn("glass block h-12 border border-border bg-card/70 shadow-[var(--shadow-pop)]", style.value === "graphite" ? "rounded-lg" : style.value === "vivid" ? "rounded-3xl" : "rounded-2xl")} />
            </ChoiceCard>
          ))}
        </div>
        <Row label="Accent">
          <div className="flex flex-wrap gap-2.5">
            {ACCENT_OPTIONS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Accent ${color}`}
                onClick={() => setTweaks({ accent: color })}
                className={cn("size-9 rounded-full ring-offset-2 ring-offset-background transition hover:scale-105", tweaks.accent === color && "ring-2 ring-ring")}
                style={{ background: color }}
              />
            ))}
          </div>
        </Row>
      </Section>

      <Section icon={<WallpaperIcon />} title="Wallpaper">
        <div className="rounded-2xl border border-border bg-card/45 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <WallpaperPreview wallpaper={customWallpaper ? "auto" : tweaks.wallpaper} custom={customWallpaper} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {customWallpaper ? String(customWallpaper.metadata?.title ?? customWallpaper.metadata?.filename ?? "Custom image") : wallpaperLabel(tweaks.wallpaper)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Image picker supports gallery, upload, link, and curated Unsplash. Custom image wins over presets.
              </p>
            </div>
            <ImagePickerButton
              label={customWallpaper ? "Change image" : "Choose image"}
              title="Set wallpaper"
              onChange={(img) => setWallpaperImage(img)}
              onUpload={uploadAsDataUrl}
              defaultQuery="macos wallpaper"
              className="w-full sm:w-auto"
            />
          </div>
          {customWallpaper && (
            <Button type="button" variant="ghost" size="sm" className="mt-2 h-8 px-2 text-xs" onClick={() => setWallpaperImage(null)}>
              Reset to presets
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {WALLPAPER_OPTIONS.map((wp) => (
            <ChoiceCard
              key={wp.value}
              active={!customWallpaper && tweaks.wallpaper === wp.value}
              label={wp.label}
              hint={wp.hint}
              onClick={() => {
                setWallpaperImage(null);
                setTweaks({ wallpaper: wp.value as Wallpaper });
              }}
            >
              <span className={cn("block h-14 rounded-xl ring-1 ring-border", wp.className)} />
            </ChoiceCard>
          ))}
        </div>
      </Section>

      <Section icon={<Monitor />} title="Shell & display">
        <Row label="Desktop shell">
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-3">
            {shellOpts("desktop").map((shell) => {
              const Icon = shell.icon;
              return (
                <ChoiceCard key={shell.id} active={prefs.desktop === shell.id} label={shell.label} onClick={() => setShell("desktop", shell.id as ShellId)}>
                  <span className="grid h-10 place-items-center rounded-xl bg-secondary text-muted-foreground"><Icon className="size-4" /></span>
                </ChoiceCard>
              );
            })}
          </div>
        </Row>
        <Row label="Mobile shell">
          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
            {shellOpts("mobile").map((shell) => {
              const Icon = shell.icon;
              return (
                <ChoiceCard key={shell.id} active={prefs.mobile === shell.id} label={shell.label} onClick={() => setShell("mobile", shell.id as ShellId)}>
                  <span className="grid h-10 place-items-center rounded-xl bg-secondary text-muted-foreground"><Icon className="size-4" /></span>
                </ChoiceCard>
              );
            })}
          </div>
        </Row>
        <Row label="Device preview">
          <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
            {DEVICE_OPTIONS.map((device) => (
              <ChoiceCard key={device.value} active={tweaks.device === device.value} label={device.label} hint={device.hint} onClick={() => setTweaks({ device: device.value as Device })}>
                <span className="grid h-9 place-items-center rounded-xl bg-secondary text-muted-foreground">
                  {device.value === "phone" ? <Smartphone className="size-4" /> : <Monitor className="size-4" />}
                </span>
              </ChoiceCard>
            ))}
          </div>
        </Row>
        <Row label="Reduce transparency">
          <Switch checked={tweaks.reduceGlass} onCheckedChange={(reduceGlass) => setTweaks({ reduceGlass })} />
        </Row>
      </Section>
    </div>
  );
}
