// The iPhone Dynamic Island — the device's physical notch cutout drawn as
// chrome. It's a silhouette element, NOT a sensor readout, so it's fine on a
// headless VPS (where we never fake wifi/battery/cellular). Purely decorative;
// centered at the top of whatever positioned surface hosts it. Black in both
// themes — the physical cutout is black regardless of wallpaper.
export function DynamicIsland() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 z-[2] h-[30px] w-[112px] -translate-x-1/2 rounded-[16px] bg-black shadow-[0_1px_3px_rgba(0,0,0,0.4),inset_0_0.5px_0_rgba(255,255,255,0.06)]"
      style={{ top: "calc(var(--sai-top) + 3px)" }}
    />
  );
}
