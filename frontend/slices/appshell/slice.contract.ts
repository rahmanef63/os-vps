/**
 * Slice contract for `appshell` — v0.1.0.
 * Excluded from app tsc; validated by rr tooling on lift.
 */
import { defineSliceContract } from "@/packages/cli/lib/contract";

export const contract = defineSliceContract({
  id: "appshell",
  version: "0.1.0",
  category: "ui",
  kind: "full",
  requires: {
    auth: "none" as const,
    rbac: [] as string[],
    env: [] as string[],
    deps: [] as const,
  },
  provides: {
    routes: [] as string[],
    hooks: [
      "useResponsive",
      "useContainer",
      "useApps",
      "useWindow",
      "useFocused",
      "useFeatures",
      "useBrand",
      "useShellUI",
      "useShellConfig",
    ] as string[],
    components: [
      "AppShell",
      "Slot",
      "AppFrame",
      "MasterDetail",
      "ResponsiveToolbar",
      "TouchList",
    ] as string[],
    tables: [] as string[],
  },
});

export default contract;
