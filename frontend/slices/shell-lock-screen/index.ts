import { defineFeature } from "@/features/appshell";
import { LockScreen } from "./components/lock-screen";

// Lock screen — privacy curtain overlay + idle auto-lock (lib/lock).
export const lockScreenFeature = defineFeature({
  id: "lock-screen",
  slots: { overlay: LockScreen },
});
