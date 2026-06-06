import {
  Cloud,
  Code,
  File,
  Film,
  Folder,
  Gauge,
  Globe,
  Grid3x3,
  Image,
  Music,
  Settings,
  Sparkles,
  Terminal,
  type LucideIcon,
} from "lucide-react";

// Single source mapping the persisted glyph string → a lucide icon. Keeps the
// stored agent/skill shape JSON-serializable (no component refs in storage).
const MAP: Record<string, LucideIcon> = {
  folder: Folder,
  globe: Globe,
  film: Film,
  image: Image,
  gauge: Gauge,
  settings: Settings,
  code: Code,
  cloud: Cloud,
  music: Music,
  grid: Grid3x3,
  file: File,
  sparkles: Sparkles,
  terminal: Terminal,
};

export function glyphIcon(name: string): LucideIcon {
  return MAP[name] ?? Sparkles;
}
