// Spotlight MRU — recently-run command ids, newest first, capped. When the
// Spotlight query is empty, these float to the top of the result list so the
// last actions a user took are one keystroke away. localStorage-only, no host.
const KEY = "os-vps:spotlight-recents";
const MAX = 6;

export function loadRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecent(id: string): void {
  if (typeof window === "undefined") return;
  const next = [id, ...loadRecents().filter((x) => x !== id)].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota — recents are best-effort */
  }
}
