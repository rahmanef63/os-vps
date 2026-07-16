// URL classification + normalization. Decides whether omnibar input is a URL
// to visit or a query to search, and derives display host / favicon source.

// Bing, not Google: results must render inside the embedded frame, and
// Google/DuckDuckGo send X-Frame-Options / frame-ancestors — Bing doesn't.
const SEARCH = "https://www.bing.com/search?q=";

/** Heuristic: does the input look like a navigable URL (vs a search query)? */
export function isUrlLike(raw: string): boolean {
  const s = raw.trim();
  if (!s || /\s/.test(s)) return false;
  if (/^https?:\/\//i.test(s)) return true;
  if (/^localhost(:\d+)?(\/.*)?$/i.test(s)) return true;
  return /^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(s); // domain.tld[/path]
}

/** Prepend https:// when a bare host/path is given. */
export function normalizeUrl(raw: string): string {
  const s = raw.trim();
  if (/^[a-z]+:\/\//i.test(s)) return s;
  return `https://${s}`;
}

/** Resolve omnibar input to a final destination: navigate or web search. */
export function toTarget(input: string): string {
  const s = input.trim();
  return isUrlLike(s) ? normalizeUrl(s) : SEARCH + encodeURIComponent(s);
}

/** Display host (www-stripped) or the raw string if it is not a real URL. */
export function hostOf(url: string): string {
  try {
    if (/^https?:\/\//i.test(url)) {
      return new URL(url).hostname.replace(/^www\./, "");
    }
  } catch {
    /* fall through */
  }
  return url;
}

/** Google favicon service URL, or null for non-http inputs. */
export function faviconFor(url: string): string | null {
  if (!/^https?:\/\//i.test(url)) return null;
  return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`;
}

/** Is the URL served over TLS? Drives the security indicator. */
export function isSecure(url: string): boolean {
  return /^https:\/\//i.test(url);
}
