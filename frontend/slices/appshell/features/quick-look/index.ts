import { defineFeature } from "@/features/appshell";
import { QuickLookOverlay } from "./components/quick-look-overlay";

// Quick Look — Space-bar preview overlay over the previewer registry
// (lib/quick-look). Apps publish a target; previewers claim it.
export const quickLookFeature = defineFeature({
  id: "quick-look",
  slots: { overlay: QuickLookOverlay },
});
