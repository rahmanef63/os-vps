"use client";

import { Monitor, Smartphone, Wallpaper as WallpaperIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  DEVICE_OPTIONS,
  uploadWallpaper,
  useAppearance,
  wallpaperLabel,
  type Device,
  type Wallpaper,
} from "@/lib/appearance";
import { ImagePickerButton, imageStyle, type ImageValue } from "@/features/image-picker";
import { setShell, shellsForSurface, useShellPrefs, type ShellId } from "@/features/os-shell";
import { SettingsRow as Row, SettingsSection as Section } from "@/features/shell-settings";

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
      <Section icon={<WallpaperIcon />} title="Wallpaper">
        <div className="rounded-2xl border border-border bg-card/45 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <WallpaperPreview wallpaper={customWallpaper ? "auto" : tweaks.wallpaper} custom={customWallpaper} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {customWallpaper ? String(customWallpaper.metadata?.title ?? customWallpaper.metadata?.filename ?? "Custom image") : wallpaperLabel(tweaks.wallpaper)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Auto follows the active shell&apos;s backdrop; colors come from the theme preset. Pick a custom image to override.
              </p>
            </div>
            <ImagePickerButton
              label={customWallpaper ? "Change image" : "Choose image"}
              title="Set wallpaper"
              onChange={(img) => setWallpaperImage(img)}
              onUpload={uploadWallpaper}
              defaultQuery="macos wallpaper"
              className="w-full sm:w-auto"
            />
          </div>
          {customWallpaper && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-8 px-2 text-xs"
              onClick={() => {
                setWallpaperImage(null);
                setTweaks({ wallpaper: "auto" });
              }}
            >
              Reset to Auto
            </Button>
          )}
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
