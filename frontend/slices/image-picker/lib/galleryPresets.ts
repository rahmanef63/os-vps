/** Curated gallery presets — solid colours, gradients, and Notion's public
 *  texture covers. Zero-config picks shown on the Gallery tab. */

import type { ImageValue } from "../types";

interface PresetSection { label: string; items: ImageValue[] }

const SOLID_COLORS: ImageValue[] = [
  "#1f2937", "#3b82f6", "#14b8a6", "#22c55e", "#eab308", "#f97316",
  "#ef4444", "#ec4899", "#a855f7", "#0ea5e9", "#111827", "#f3f4f6",
].map((value) => ({ type: "color", value, positionY: 50 }));

const GRADIENTS: ImageValue[] = [
  "linear-gradient(135deg,#667eea 0%,#764ba2 100%)",
  "linear-gradient(135deg,#f093fb 0%,#f5576c 100%)",
  "linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)",
  "linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)",
  "linear-gradient(135deg,#fa709a 0%,#fee140 100%)",
  "linear-gradient(135deg,#30cfd0 0%,#330867 100%)",
  "linear-gradient(135deg,#a8edea 0%,#fed6e3 100%)",
  "linear-gradient(135deg,#ff9a9e 0%,#fecfef 100%)",
].map((value) => ({ type: "gradient", value, positionY: 50 }));

const TEX = (n: string) => `https://www.notion.so/images/page-cover/${n}`;
const TEXTURES: ImageValue[] = [
  "woodcuts_1.jpg", "woodcuts_3.jpg", "woodcuts_5.jpg", "met_canaletto.jpg",
  "met_william_morris.jpg", "gradients_8.png", "gradients_10.jpg", "solid_beige.png",
].map((n) => ({ type: "texture", value: TEX(n), positionY: 50 }));

export const GALLERY_SECTIONS: PresetSection[] = [
  { label: "Color & Gradient", items: [...SOLID_COLORS, ...GRADIENTS] },
  { label: "Textures", items: TEXTURES },
];
