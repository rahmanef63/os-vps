"use client";

import { Button } from "@/components/ui/button";
import type { Bookmark } from "../lib/storage";
import { Favicon } from "./favicon";

type BookmarkBarProps = {
  bookmarks: Bookmark[];
  onOpen: (url: string) => void;
};

export function BookmarkBar({ bookmarks, onOpen }: BookmarkBarProps) {
  if (bookmarks.length === 0) return null;
  return (
    // border-t splits it from the omnibar; AppFrame's toolbar slot owns the
    // bottom border. Scrolls horizontally on narrow panes (no wrap).
    <div className="flex items-center gap-0.5 overflow-x-auto border-t bg-card px-2 py-1">
      {bookmarks.map((b, i) => (
        <Button
          key={`${b.url}-${i}`}
          variant="ghost"
          size="sm"
          title={b.url}
          onClick={() => onOpen(b.url)}
          className="h-6 max-w-44 shrink-0 gap-1.5 px-2 text-xs font-normal text-muted-foreground"
        >
          <Favicon url={b.url} className="size-3 shrink-0" />
          <span className="truncate">{b.title}</span>
        </Button>
      ))}
    </div>
  );
}
