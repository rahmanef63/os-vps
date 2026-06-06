import { Sparkles } from "lucide-react";
import type { AppDescriptor } from "@/features/os-shell";

// Barrel: the only thing the app layer imports. Exposes the app descriptor;
// the component itself is lazy-loaded via `load` so its bundle is deferred.
export const assistantApp: AppDescriptor = {
  id: "assistant",
  title: "Alfa",
  icon: Sparkles,
  gradient: "linear-gradient(160deg,#a855f7,#6d28d9)",
  load: () => import("./app"),
  defaultSize: { w: 520, h: 620 },
};
