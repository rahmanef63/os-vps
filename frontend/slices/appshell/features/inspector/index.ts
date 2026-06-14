import { defineFeature } from "@/features/appshell";
import { Inspector } from "./components/inspector";

// Inspector — the right-docked app-context panel + scoped AI chat (desktop).
// The publish bus (usePublishInspector) stays in appshell core so apps publish
// state without depending on this feature slice.
export const inspectorFeature = defineFeature({
  id: "inspector",
  slots: { rightPanel: Inspector },
});
