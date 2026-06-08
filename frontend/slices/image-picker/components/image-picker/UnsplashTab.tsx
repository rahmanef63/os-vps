"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CURATED_UNSPLASH } from "../../lib/unsplashCurated";
import type { ImageValue, UnsplashPhoto, UnsplashSearchFn } from "../../types";

export function UnsplashTab({
  onSelect, searchUnsplash, defaultQuery,
}: { onSelect: (c: ImageValue) => void; searchUnsplash?: UnsplashSearchFn; defaultQuery?: string }) {
  const [q, setQ] = React.useState(defaultQuery ?? "");
  const [photos, setPhotos] = React.useState<UnsplashPhoto[]>(CURATED_UNSPLASH);
  const [curated, setCurated] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const run = React.useCallback(async (query: string) => {
    if (!query.trim() || !searchUnsplash) return;
    setBusy(true);
    setErr(null);
    const res = await searchUnsplash(query.trim(), 24);
    setBusy(false);
    if (res.error) setErr(res.error);
    setPhotos(res.photos.length ? res.photos : CURATED_UNSPLASH);
    setCurated(res.photos.length === 0);
  }, [searchUnsplash]);

  // Auto-run the default query (e.g. the wallpaper picker's "macos wallpaper").
  React.useEffect(() => {
    if (!defaultQuery || !searchUnsplash) return;
    const id = window.setTimeout(() => void run(defaultQuery), 0);
    return () => window.clearTimeout(id);
  }, [defaultQuery, searchUnsplash, run]);

  const pick = (p: UnsplashPhoto) =>
    onSelect({
      type: "unsplash", value: p.regular, positionY: 50,
      metadata: { id: p.id, thumb: p.thumb, full: p.full, photographer: p.photographer, photographerUrl: p.photographerUrl, source: p.source },
    });

  return (
    <div className="space-y-3 p-4">
      <div className="flex gap-2">
        <Input
          placeholder={searchUnsplash ? "Search Unsplash…" : "Curated picks (wire searchUnsplash for live search)"}
          value={q} disabled={!searchUnsplash}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(q)}
        />
        <Button onClick={() => run(q)} disabled={!searchUnsplash || busy} size="icon" aria-label="Search">
          <Search className="h-4 w-4" />
        </Button>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
      {curated && (
        <p className="text-[11px] text-muted-foreground">
          Curated landscapes{searchUnsplash ? " — search above for more" : ""}.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((p) => (
          <button
            key={p.id} type="button" onClick={() => pick(p)}
            className="group relative h-20 overflow-hidden rounded-md ring-1 ring-border transition hover:ring-2 hover:ring-primary"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumb} alt={p.alt} loading="lazy" className="h-full w-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1 py-0.5 text-[9px] text-white opacity-0 transition group-hover:opacity-100">
              {p.photographer}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
