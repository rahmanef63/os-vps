import { cn } from "@/lib/utils";
import type { AppDescriptor } from "../lib/types";

// Glossy rounded-square app icon (os-rr): gradient base + inset highlight +
// top-light sheen overlay + the app's lucide glyph.
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
        "relative grid size-full place-items-center overflow-hidden rounded-[var(--radius-icon)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_-2px_5px_rgba(0,0,0,0.18),0_3px_8px_rgba(0,0,0,0.22)]",
        className,
      )}
      style={{ background: app.gradient }}
    >
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/45 to-transparent to-[48%]" />
      <Icon className="relative z-[1] size-[54%]" strokeWidth={2.2} />
    </span>
  );
}
