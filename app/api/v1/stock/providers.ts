// Stock-photo providers for /api/v1/stock/search. Both upstreams map to ONE
// slim shape so the client never cares which answered: Unsplash (better
// quality) when OS_UNSPLASH_ACCESS_KEY is configured, keyless Openverse
// (anonymous, upstream rate-limited) otherwise.

export interface StockResult {
  id: string;
  thumb: string;
  url: string;
  title: string;
  creator: string;
  license: string;
}

type Rec = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === "string" ? v : "");

async function getJson(url: string, headers?: Record<string, string>): Promise<{ results?: Rec[] }> {
  const res = await fetch(url, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  return (await res.json()) as { results?: Rec[] };
}

// Openverse license slugs are lowercase ("by-sa", "cc0", "pdm") — render the
// canonical badge form ("CC BY-SA", "CC0", "PDM").
function ccLabel(slug: string): string {
  const up = slug.toUpperCase();
  if (!up || up === "CC0" || up === "PDM") return up || "Openverse";
  return `CC ${up}`;
}

export async function searchOpenverse(q: string, page: number): Promise<StockResult[]> {
  const u = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=24&page=${page}`;
  const data = await getJson(u);
  return (data.results ?? [])
    .map((r) => ({
      id: str(r.id),
      thumb: str(r.thumbnail) || str(r.url),
      url: str(r.url),
      title: str(r.title),
      creator: str(r.creator),
      license: ccLabel(str(r.license)),
    }))
    .filter((r) => r.url);
}

export async function searchUnsplash(q: string, page: number, key: string): Promise<StockResult[]> {
  const u = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=24&page=${page}`;
  const data = await getJson(u, { Authorization: `Client-ID ${key}` });
  return (data.results ?? [])
    .map((r) => {
      const urls = (r.urls ?? {}) as Rec;
      const user = (r.user ?? {}) as Rec;
      return {
        id: str(r.id),
        thumb: str(urls.small),
        url: str(urls.regular),
        title: str(r.alt_description) || str(r.description),
        creator: str(user.name),
        license: "Unsplash",
      };
    })
    .filter((r) => r.url);
}
