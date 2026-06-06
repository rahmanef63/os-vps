// Editor preferences, persisted to localStorage. Read through getSettings()
// (cached) so pure libs (composition.ts) can use them without React.

export type EditorSettings = {
  /** default clip length for still images, in seconds */
  imageDur: number;
  /** persist the project draft automatically */
  autosave: boolean;
  /** base folder the Project-files pane opens in (created on first use) */
  projectDir: string;
};

const KEY = "reel.settings";
const DEFAULTS: EditorSettings = { imageDur: 3, autosave: true, projectDir: "~/reel-projects/session" };

let cache: EditorSettings | null = null;

export function getSettings(): EditorSettings {
  if (cache) return cache;
  if (typeof window === "undefined") return DEFAULTS;
  try {
    cache = { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<EditorSettings>) };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

export function saveSettings(patch: Partial<EditorSettings>): EditorSettings {
  cache = { ...getSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* private mode — settings just won't persist */
  }
  return cache;
}
