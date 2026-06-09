// SSOT for the UI typeface picker. These are SYSTEM font stacks (no webfont
// download), so a pick renders instantly on any device and the self-contained
// VPS cockpit ships zero font assets. The picker drives ONE token — `--font-ui`
// — applied INLINE on <html> by the appearance store, so an explicit choice
// WINS over a color preset's font (inline beats the preset's injected :root
// rule); "system" removes the override and falls back to the active preset (or
// the Geist default in globals.css). Add a face = one entry here. Stacks follow
// the curated "modern-font-stacks" system set (graceful per-OS degradation).

export type FontKey =
  | "system" | "geist" | "humanist" | "geometric" | "classical"
  | "neogrotesque" | "rounded" | "slab" | "mono";

export type FontOption = {
  key: FontKey;
  label: string;
  /** CSS font-family stack. Empty for "system" — selecting it clears the
   *  override so the preset (or globals.css Geist default) shows through. */
  stack: string;
};

export const FONT_OPTIONS: readonly FontOption[] = [
  { key: "system", label: "System", stack: "" },
  { key: "geist", label: "Geist", stack: "var(--font-geist-sans), system-ui, sans-serif" },
  { key: "humanist", label: "Humanist", stack: "Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'DejaVu Sans', 'Source Sans Pro', sans-serif" },
  { key: "geometric", label: "Geometric", stack: "Avenir, Montserrat, Corbel, 'URW Gothic', source-sans-pro, sans-serif" },
  { key: "classical", label: "Classical", stack: "Optima, Candara, 'Noto Sans', source-sans-pro, sans-serif" },
  { key: "neogrotesque", label: "Neo-grotesque", stack: "Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Nimbus Sans', Arial, sans-serif" },
  { key: "rounded", label: "Rounded", stack: "ui-rounded, 'Hiragino Maru Gothic ProN', Quicksand, Comfortaa, Manjari, 'Arial Rounded MT Bold', Calibri, source-sans-pro, sans-serif" },
  { key: "slab", label: "Slab serif", stack: "Rockwell, 'Rockwell Nova', 'Roboto Slab', 'DejaVu Serif', 'Sitka Small', serif" },
  { key: "mono", label: "Monospace", stack: "var(--font-geist-mono), ui-monospace, 'SF Mono', 'Cascadia Mono', Menlo, Consolas, monospace" },
];

const STACK = new Map<FontKey, string>(FONT_OPTIONS.map((f) => [f.key, f.stack]));

/** The CSS stack for a key, or null for "system" (no override). */
export function fontStack(key: FontKey): string | null {
  return STACK.get(key) || null;
}

/** A safe FontKey from arbitrary stored input (back-compat / corrupt cache). */
export function asFontKey(v: unknown): FontKey {
  return typeof v === "string" && STACK.has(v as FontKey) ? (v as FontKey) : "system";
}
