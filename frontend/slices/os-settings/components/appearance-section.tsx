"use client";

import { useAppearance, ACCENTS, type Device, type Dir, type Wallpaper } from "@/lib/appearance";
import { AppearancePanel, type AppearanceAdapter } from "@/features/shell-settings";
import { useShellPrefs, setShell, shellsForSurface, type ShellId } from "@/features/os-shell";

// os-vps's option catalogue — the project-specific choices the generic shell
// AppearancePanel renders. Kept here (the consumer) so the slice stays brand-free.
const STYLE_OPTS = [
  { value: "aqua", label: "Aqua" },
  { value: "graphite", label: "Graphite" },
  { value: "vivid", label: "Vivid" },
];
const WALLPAPER_OPTS = [
  { value: "auto", label: "Auto (OS)" },
  { value: "aurora", label: "Aurora" },
  { value: "dusk", label: "Dusk" },
  { value: "mist", label: "Mist" },
  { value: "graphite", label: "Graphite" },
  { value: "noir", label: "Noir" },
  { value: "win11", label: "Bloom" },
  { value: "material", label: "Material" },
  { value: "ios", label: "iOS" },
];
const DEVICE_OPTS = [
  { value: "auto", label: "Auto" },
  { value: "desktop", label: "Desktop" },
  { value: "phone", label: "Phone" },
];

// Adapts the os-vps appearance store + the appshell shell registry to the
// generic shell AppearancePanel. The Shell group switches the OS layout per
// surface (desktop: macOS/Windows/Dashboard · mobile: iOS/Android) live —
// windows persist across switches (one shared window store).
export function AppearanceSection() {
  const { tweaks, setTweaks } = useAppearance();
  const prefs = useShellPrefs();
  const shellOpts = (surface: "desktop" | "mobile") =>
    shellsForSurface(surface).map((s) => ({ value: s.id, label: s.label }));

  const appearance: AppearanceAdapter = {
    style: { value: tweaks.dir, options: STYLE_OPTS, onChange: (v) => setTweaks({ dir: v as Dir }) },
    accent: { value: tweaks.accent, options: [...ACCENTS], onChange: (c) => setTweaks({ accent: c }) },
    wallpaper: { value: tweaks.wallpaper, options: WALLPAPER_OPTS, onChange: (v) => setTweaks({ wallpaper: v as Wallpaper }) },
    shellDesktop: { value: prefs.desktop, options: shellOpts("desktop"), onChange: (v) => setShell("desktop", v as ShellId) },
    shellMobile: { value: prefs.mobile, options: shellOpts("mobile"), onChange: (v) => setShell("mobile", v as ShellId) },
    device: { value: tweaks.device, options: DEVICE_OPTS, onChange: (v) => setTweaks({ device: v as Device }) },
    reduceTransparency: { value: tweaks.reduceGlass, onChange: (on) => setTweaks({ reduceGlass: on }) },
  };
  return <AppearancePanel appearance={appearance} />;
}
