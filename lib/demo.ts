// Demo mode. Build/deploy with NEXT_PUBLIC_OS_DEMO=1 for a public showcase:
// no login, forced mock data, feature menus persisted to localStorage. There is
// no host access and no /api calls in demo, so it's safe to expose publicly.
export const IS_DEMO = process.env.NEXT_PUBLIC_OS_DEMO === "1";
