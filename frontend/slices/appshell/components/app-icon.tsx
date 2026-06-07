import { cn } from "@/lib/utils";
import type { AppDescriptor } from "../lib/types";

// macOS-style squircle app icon: gradient tile + soft full-height top light
// (no hard iOS-glass line), hairline edge ring, layered drop shadow and a
// subtly shadowed lucide glyph — modeled on the Ventura dock.
export function AppIcon({
  app,
  className,
}: {
  app: AppDescriptor;
  className?: string;
}) {
  const Icon = app.icon;
  return (
    <span
      className={cn(
        "relative grid size-full place-items-center overflow-hidden rounded-[var(--radius-icon)] text-white",
        "shadow-[0_1px_2px_rgba(0,0,0,0.2),0_4px_10px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.12)]",
        className,
      )}
      style={{ background: app.gradient }}
    >
      {/* gentle luminance ramp: lit top → neutral middle → shaded base */}
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0.08)_42%,rgba(255,255,255,0)_60%,rgba(0,0,0,0.08))]" />
      {/* hairline ring keeps the tile defined on bright wallpapers */}
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/15" />
      <Icon className="relative z-[1] size-[52%] drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]" strokeWidth={2.1} />
    </span>
  );
}
