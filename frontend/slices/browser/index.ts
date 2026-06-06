import { Globe } from "lucide-react";
import type { AppDescriptor } from "@/features/os-shell";

// Barrel: the only thing the app layer imports. Exposes the app descriptor;
// the component itself is lazy-loaded via `load` so its bundle is deferred.
export const browserApp: AppDescriptor = {
  id: "browser",
  title: "Browser",
  icon: Globe,
  gradient: "linear-gradient(160deg,#54a0ff,#2e86de)",
  load: () => import("./app"),
  defaultSize: { w: 900, h: 620 },
};
