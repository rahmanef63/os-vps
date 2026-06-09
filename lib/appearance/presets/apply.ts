import { loadPresetRegistry, findPreset } from "./registry";
import { PRESET_STYLE_ID, type PresetItem } from "./types";

// Applies a tweakcn preset by deriving the os-rr CHROME tokens (--surface,
// --text, --glass-*, --window-bg, …) from the preset's shadcn palette. The
// shadcn bridge in globals.css (--background: var(--surface), …) then follows
// automatically, so windows, glass bars, dock AND app content all retheme from
// one injection. Alpha layers use color-mix so any color format works.
// Dark mode keys off [data-theme="dark"] (os-rr convention, NOT `.dark`).

const mix = (c: string, pct: number) =>
  `color-mix(in oklab, ${c} ${pct}%, transparent)`;

function chromeVars(
  v: Record<string, string>,
  mode: "light" | "dark",
): string[] {
  const bg = v.background ?? (mode === "dark" ? "oklch(0.2 0 0)" : "oklch(1 0 0)");
  const fg = v.foreground ?? (mode === "dark" ? "oklch(0.95 0 0)" : "oklch(0.15 0 0)");
  const card = v.card ?? bg;
  const popover = v.popover ?? card;
  const lines = [
    `--surface: ${bg};`,
    `--text: ${fg};`,
    `--text-dim: ${v["muted-foreground"] ?? mix(fg, 62)};`,
    `--text-faint: ${mix(fg, 38)};`,
    `--sep: ${v.border ?? mix(fg, 12)};`,
    `--sep-strong: ${mix(fg, 22)};`,
    `--glass-bar: ${mix(bg, 62)};`,
    `--glass-panel: ${mix(card, 78)};`,
    `--glass-menu: ${mix(popover, 86)};`,
    `--window-bg: ${mix(card, 86)};`,
    `--window-head: ${mix(card, 55)};`,
    `--sidebar: ${mix(v.sidebar ?? card, 70)};`,
    `--field: ${mode === "dark" ? mix(fg, 8) : mix(bg, 70)};`,
    `--hover: ${mix(fg, 6)};`,
    `--hover-strong: ${mix(fg, 11)};`,
    `--inset: ${mode === "dark" ? "rgba(0, 0, 0, 0.25)" : mix(fg, 4)};`,
    `--dock-bg: ${mix(card, mode === "dark" ? 42 : 34)};`,
  ];
  if (v.primary) lines.push(`--accent: ${v.primary};`);
  if (v["primary-foreground"]) lines.push(`--accent-text: ${v["primary-foreground"]};`);
  if (v.accent) lines.push(`--accent-bg: ${mix(v.accent, 60)};`);
  if (v["accent-foreground"]) lines.push(`--accent-foreground: ${v["accent-foreground"]};`);
  if (v.destructive) lines.push(`--destructive: ${v.destructive};`);
  return lines;
}

// High-contrast a11y must keep winning over the (later-in-cascade) injected
// block, so re-derive its separator/text overrides from the preset palette.
function contrastVars(v: Record<string, string>, mode: "light" | "dark"): string[] {
  const fg = v.foreground ?? (mode === "dark" ? "oklch(0.95 0 0)" : "oklch(0.15 0 0)");
  return [
    `--sep: ${mix(fg, 45)};`,
    `--sep-strong: ${mix(fg, 60)};`,
    `--text-dim: ${mix(fg, 90)};`,
  ];
}

const block = (selector: string, lines: string[]) =>
  `${selector} {\n  ${lines.join("\n  ")}\n}`;

function buildCss(preset: PresetItem): string {
  const light = preset.cssVars?.light ?? {};
  const dark = preset.cssVars?.dark ?? {};
  const blocks = [
    block(":root", chromeVars(light, "light")),
    block(".high-contrast", contrastVars(light, "light")),
    block('[data-theme="dark"]', chromeVars(dark, "dark")),
    block('.high-contrast[data-theme="dark"]', contrastVars(dark, "dark")),
  ];
  // Theme-level tokens (font + radius) so type, corners, and color all retheme
  // from ONE preset (DRY). Geist stays the loaded fallback if the preset font
  // isn't installed; clearPreset() removes this whole tag → back to stock.
  const theme = preset.cssVars?.theme ?? {};
  const rootTheme: string[] = [];
  const radius = theme.radius ?? light.radius;
  if (radius) rootTheme.push(`--radius: ${radius};`);
  if (theme["font-sans"])
    rootTheme.push(`--font-ui: ${theme["font-sans"]}, var(--font-geist-sans), system-ui, sans-serif;`);
  if (theme["font-mono"])
    rootTheme.push(`--font-mono: ${theme["font-mono"]}, var(--font-geist-mono), ui-monospace, monospace;`);
  if (rootTheme.length) blocks.push(block(":root", rootTheme));
  return blocks.join("\n\n");
}

/** Injects (or replaces) the preset style tag. No persistence here — the
 *  AppearanceProvider owns that via `tweaks.preset`. */
export async function applyPreset(name: string): Promise<void> {
  const registry = await loadPresetRegistry();
  const preset = findPreset(registry, name);
  if (!preset) return;
  let el = document.getElementById(PRESET_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = PRESET_STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = buildCss(preset);
}

/** Removes the injected preset vars — back to the stock os-rr palette. */
export function clearPreset(): void {
  document.getElementById(PRESET_STYLE_ID)?.remove();
}
