// shell-settings — portable, brand-free shell settings UI. The shell-level panels
// (appearance + display) plus the generic Section/Row building blocks. The consumer
// (e.g. the os-settings app) composes these and injects an AppearanceAdapter built
// from its own appearance store, so this slice carries no project-specific values.
export { SettingsSection } from "./components/section";
export { SettingsRow } from "./components/row";
export { AccentSwatches } from "./components/accent-swatches";
export { AppearancePanel } from "./components/appearance-panel";
export type { AppearanceAdapter, SegSetting, SettingOption } from "./lib/types";
