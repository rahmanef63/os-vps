import {
  LayoutGrid,
  Code,
  Globe,
  Image,
  Music,
  Gauge,
  Folder,
  Cloud,
  Box,
  type LucideIcon,
} from "lucide-react";

// Stored apps keep an icon as a string key (portable across the persisted row);
// the shell resolves it to a Lucide component here. Keep in sync with the
// Create App glyph picker.
const MAP: Record<string, LucideIcon> = {
  grid: LayoutGrid,
  code: Code,
  globe: Globe,
  image: Image,
  music: Music,
  gauge: Gauge,
  folder: Folder,
  cloud: Cloud,
};

export const GLYPH_KEYS = Object.keys(MAP);

export function glyphIcon(key: string): LucideIcon {
  return MAP[key] ?? Box;
}
