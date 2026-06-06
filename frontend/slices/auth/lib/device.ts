// Stable per-browser device id — the second auth factor. 128-bit random hex,
// minted once and mirrored into BOTH localStorage AND a long-lived cookie. If a
// "clear cache" wipes one store but keeps the other, the survivor restores the
// id, so the device isn't re-minted (no needless re-approval). A full "clear
// all site data" wipes both → a new id, by design (the device's stored secret
// is gone, so it's correctly treated as a new device).
const KEY = "os-vps.device.id";
const COOKIE = "os-vps-device";
const RE = /^[a-f0-9]{16,128}$/i;
const MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years (refreshed on every read)

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  // Not httpOnly — the client must read it; same JS-exposure as localStorage.
  // The server never reads it (login uses the request body), so it's pure
  // client storage. Secure only on https so localhost dev still persists it.
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${MAX_AGE}; Path=/; SameSite=Strict${secure}`;
}

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  // Prefer localStorage; fall back to the cookie (survivor of a cache-only
  // clear); mint a fresh id only when neither store holds a valid one.
  let id = localStorage.getItem(KEY);
  if (!id || !RE.test(id)) {
    const fromCookie = readCookie(COOKIE);
    if (fromCookie && RE.test(fromCookie)) id = fromCookie;
  }
  if (!id || !RE.test(id)) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    id = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Mirror into both so either one can restore the other next time.
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* private mode / quota — the cookie still carries it */
  }
  writeCookie(COOKIE, id);
  return id;
}

// Friendly, untrusted label so the approver can tell devices apart.
export function deviceLabel(): string {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent;
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Mac/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  return `${browser} · ${os}`;
}
