"use client";

// Re-export of the shared viewport-window primitive — actual implementation
// lives in appshell/lib so multiple slices (files-manager, spotlight, future
// grids) share one source of truth and one set of unit tests.
export {
  computeViewportWindow,
  useViewportWindow,
  type ViewportWindow,
} from "@/features/appshell/lib/use-viewport-window";
