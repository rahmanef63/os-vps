/** Build an UnsplashSearchFn that proxies through a host endpoint (a Next route
 *  / Convex action that holds the secret UNSPLASH_ACCESS_KEY server-side — the
 *  key must never reach the client). The endpoint is expected to return
 *  `{ photos: UnsplashPhoto[], total?, error? }`. Wire it into the picker:
 *    <ImagePickerButton searchUnsplash={unsplashSearchVia("/api/unsplash")} … /> */

import type { UnsplashSearchFn, UnsplashSearchResult } from "../types";

export function unsplashSearchVia(endpoint: string): UnsplashSearchFn {
  return async (query: string, perPage = 24): Promise<UnsplashSearchResult> => {
    const url = `${endpoint}?query=${encodeURIComponent(query)}&per_page=${perPage}`;
    let res: Response;
    try {
      res = await fetch(url);
    } catch (e) {
      return { photos: [], error: `Network error: ${(e as Error).message}` };
    }
    if (!res.ok) {
      return { photos: [], error: `Unsplash ${res.status}` };
    }
    try {
      return (await res.json()) as UnsplashSearchResult;
    } catch {
      return { photos: [], error: "Bad response" };
    }
  };
}
