/**
 * Slice contract for `appshell` — v1.5.1.
 * Excluded from app tsc; validated by rr tooling on lift.
 */
import { defineSliceContract } from "@/packages/cli/lib/contract";

export const contract = defineSliceContract({
  id: "appshell",
  version: "1.5.1",
  category: "ui",
  kind: "full",
  requires: {
    auth: "none" as const,
    rbac: [] as string[],
    env: [] as string[],
    deps: [] as const,
  },
  provides: {
    // os-vps runs no agent — the shell's window ops are exposed as store
    // functions (openWindow/closeWindow/…), not registered agent tools. rr's
    // optional @/shared/agentic toolkit (appshell/agentic) is absent here, so
    // provides.tools is empty by design.
    tools: [] as string[],
    routes: [] as string[],
    hooks: [
      "useCommands",
      "useBadges",
      "useRecents",
      "useLayouts",
      "useActiveSpace",
      "useClips",
      "useShareState",
      "useQuickLook",
      "useShortcuts",
      "useFocusMode",
      "useLocked",
      "useProfiles",
      "useResponsive",
      "useContainer",
      "useApps",
      "useWindow",
      "useFocused",
      "useFeatures",
      "useBrand",
      "useShellUI",
      "useShellConfig",
      "useQuickLinks",
    ] as string[],
    components: [
      "AppShell",
      "Slot",
      "AppFrame",
      "MasterDetail",
      "ResponsiveToolbar",
      "TouchList",
      "QuicklinkIcon",
    ] as string[],
    tables: [] as string[],
  },
});

export default contract;
