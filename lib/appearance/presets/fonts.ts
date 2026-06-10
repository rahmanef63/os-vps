// Webfont loader for tweakcn presets. A preset's cssVars.theme names real
// faces (Inter, Poppins, JetBrains Mono, …) — injecting `--font-ui` alone is
// not enough, the font bytes must exist or every preset silently falls back to
// Geist. This swaps ONE Google Fonts stylesheet link per preset; local/system
// families (and the self-hosted Geist pair) are skipped, and offline the
// stack's `var(--font-geist-sans)` fallback keeps rendering — no hard dep.

const LINK_ID = "os-theme-preset-fonts";

// First-family names that must never be fetched: CSS generics, local UI
// stacks, and faces the app already ships (Geist via next/font).
const LOCAL = new Set([
  "system-ui", "ui-sans-serif", "ui-serif", "ui-monospace", "ui-rounded",
  "sans-serif", "serif", "monospace", "cursive", "fantasy",
  "-apple-system", "blinkmacsystemfont", "segoe ui",
  "arial", "helvetica", "helvetica neue", "georgia", "times", "times new roman",
  "courier", "courier new", "verdana", "tahoma", "trebuchet ms",
  "menlo", "monaco", "consolas", "sf mono",
  "geist", "geist mono",
]);

/** Fetchable first family of a font stack, or null (local/generic/garbage). */
function familyOf(stack: string | undefined): string | null {
  if (!stack) return null;
  const first = stack.split(",")[0]?.trim().replace(/^['"]+|['"]+$/g, "").trim();
  if (!first || !/^[A-Za-z0-9][A-Za-z0-9 ]*$/.test(first)) return null;
  return LOCAL.has(first.toLowerCase()) ? null : first;
}

/** Point the preset font link at the families this preset's theme names. */
export function ensurePresetFonts(theme: Record<string, string>): void {
  const families = [
    ...new Set(
      [theme["font-sans"], theme["font-mono"]]
        .map(familyOf)
        .filter((f): f is string => f !== null),
    ),
  ];
  const existing = document.getElementById(LINK_ID) as HTMLLinkElement | null;
  if (!families.length) {
    existing?.remove();
    return;
  }
  const query = families
    .map((f) => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700`)
    .join("&");
  const href = `https://fonts.googleapis.com/css2?${query}&display=swap`;
  if (existing) {
    if (existing.href !== href) existing.href = href;
    return;
  }
  const el = document.createElement("link");
  el.id = LINK_ID;
  el.rel = "stylesheet";
  el.href = href;
  document.head.appendChild(el);
}

/** Drop the preset font stylesheet — back to the shipped Geist pair. */
export function clearPresetFonts(): void {
  document.getElementById(LINK_ID)?.remove();
}
