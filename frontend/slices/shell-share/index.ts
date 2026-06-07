import { defineFeature } from "@/features/appshell";
import { ShareSheet } from "./components/share-sheet";

// Share sheet — overlay listing every registered target that claims the
// shared payload (lib/share). Keyboard-first: arrows + Enter + Escape.
export const shareFeature = defineFeature({
  id: "share",
  slots: { overlay: ShareSheet },
});
