import { Eye } from "lucide-react";
import type { AppDescriptor } from "@/features/os-shell";

// Barrel: app layer imports only this descriptor. The component is lazy-loaded
// via `load`. noDock — opened from the launcher, not pinned to the dock.
export const mediaViewerApp: AppDescriptor = {
  id: "media-viewer",
  title: "Preview",
  icon: Eye,
  gradient: "linear-gradient(160deg,#1dd1a1,#10ac84)",
  load: () => import("./app"),
  defaultSize: { w: 720, h: 540 },
  noDock: true,
};
