"use client";

import { cn } from "@/lib/utils";
import { useShellAppearance } from "../registry/capabilities";

export function Wallpaper({ shellDefault }: { shellDefault?: string }) {
  const { wallpaper, wallpaperStyle } = useShellAppearance();
  // Custom image/gradient (from the host's image-picker) wins over the preset.
  if (wallpaperStyle) {
    return <div style={wallpaperStyle} className="absolute inset-0 z-0 bg-cover bg-center transition-[background] duration-700" />;
  }
  // "auto" (or no choice) follows the active shell's native backdrop.
  const preset = !wallpaper || wallpaper === "auto" ? (shellDefault ?? "aurora") : wallpaper;
  return <div className={cn(`wp-${preset} absolute inset-0 z-0 transition-[background] duration-700`)} />;
}
