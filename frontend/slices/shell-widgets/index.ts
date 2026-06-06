import { defineFeature } from "@/features/appshell";
import { MobileWidgets } from "./components/mobile-widgets";

// Widgets — the iOS "Today" page: live system widgets + quick shortcuts
// (mobile only), mounted into the home pager's today slot.
export const widgetsFeature = defineFeature({
  id: "widgets",
  slots: { today: MobileWidgets },
});
