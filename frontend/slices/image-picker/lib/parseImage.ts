/** Normalize a stored image field into an ImageValue (or null). Keeps legacy
 *  raw-string values working — raw URLs / CSS colours / gradients are detected
 *  and wrapped. */

import type { ImageValue, ImageField } from "../types";

function looksLikeGradient(s: string): boolean {
  return /^(linear|radial|conic)-gradient\(/i.test(s.trim());
}

function looksLikeColor(s: string): boolean {
  const v = s.trim();
  return /^#[0-9a-f]{3,8}$/i.test(v)
    || /^(rgb|rgba|hsl|hsla)\(/i.test(v)
    || /^(red|blue|green|black|white|gray|grey|yellow|orange|purple|pink|brown)$/i.test(v);
}

function looksLikeUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim()) || /^storage:/i.test(s.trim());
}

export function parseImage(field: ImageField): ImageValue | null {
  if (!field) return null;
  if (typeof field === "object") return field;
  const value = field.trim();
  if (!value) return null;
  if (looksLikeGradient(value)) return { type: "gradient", value, positionY: 50 };
  if (looksLikeColor(value)) return { type: "color", value, positionY: 50 };
  if (looksLikeUrl(value)) return { type: "link", value, positionY: 50 };
  return { type: "color", value, positionY: 50 };
}

/** color / gradient — value is a CSS background, no URL resolution needed. */
export function isCssImage(c: ImageValue): boolean {
  return c.type === "color" || c.type === "gradient";
}

/** texture / upload / link / unsplash — value is an image URL or FileRef. */
export function isUrlImage(c: ImageValue): boolean {
  return !isCssImage(c);
}

/** Storage-backed (upload) values need the host to resolve their FileRef. */
export function imageRef(c: ImageValue | null): string | null {
  return c && c.type === "upload" ? c.value : null;
}
