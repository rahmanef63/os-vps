import { defineFeature } from "@/features/appshell";
import { ControlCenter } from "./components/control-center";

// Control Center — iOS-style pull-down toggles (mobile only). Open state is
// owned by the mobile surface and read via the shell-UI context.
export const controlCenterFeature = defineFeature({
  id: "control-center",
  slots: { controlCenter: ControlCenter },
});
