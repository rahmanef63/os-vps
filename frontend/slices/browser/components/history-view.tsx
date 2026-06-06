"use client";

import { X, History as HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { relTime, type HistoryEntry } from "../lib/storage";
import { Favicon } from "./favicon";

type HistoryViewProps = {
  history: HistoryEntry[];
  onOpen: (url: string) => void;
  onClose: () => void;
};

// Overlay panel anchored top-right of the viewport, dismissed via backdrop.
export function HistoryView({ history, onOpen, onClose }: HistoryViewProps) {
  return (
    <div className="absolute inset-0 z-20" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-2 right-2 flex max-h-[min(360px,90%)] w-80 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg"
      >
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <HistoryIcon className="size-3.5 text-muted-foreground" />
          <span className="flex-1 text-xs font-bold tracking-wider uppercase text-muted-foreground">
            History
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-5"
            onClick={onClose}
          >
            <X className="size-3.5" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {history.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              Nothing here yet.
            </p>
          ) : (
            <div className="p-1">
              {history.slice(0, 40).map((h, i) => (
                <Button
                  key={`${h.url}-${i}`}
                  type="button"
                  variant="ghost"
                  onClick={() => onOpen(h.url)}
                  className="flex h-auto w-full cursor-default items-center justify-start gap-2 rounded-md px-2 py-1.5 text-left text-xs font-normal hover:bg-muted/60"
                >
                  <Favicon url={h.url} className="size-3.5 shrink-0" />
                  <span className="flex-1 truncate">{h.title}</span>
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {relTime(h.time)}
                  </span>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
