"use client";

import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { hostOf } from "../lib/url";

type EmbedViewProps = {
  url: string;
  frameKey: string;
  active: boolean;
  onLoad: () => void;
};

// Sandboxed-iframe page view. One per tab, kept mounted while inactive so
// switching tabs doesn't reload the page. Sites that send X-Frame-Options /
// frame-ancestors render blank — inherent to embedding; a cross-origin frame
// gives no readable failure signal, so no detection is attempted.
export function EmbedView({ url, frameKey, active, onLoad }: EmbedViewProps) {
  if (!url)
    return (
      <div
        className={cn(
          "absolute inset-0 grid place-items-center bg-background",
          !active && "hidden",
        )}
      >
        <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center">
          <Globe className="size-10 text-muted-foreground/50" />
          <p className="text-sm font-medium">Search or enter a URL</p>
          <p className="text-xs text-muted-foreground">
            Pages render in an embedded frame. Sites that refuse embedding
            (X-Frame-Options) stay blank — copy the link and open them in a
            regular tab instead.
          </p>
        </div>
      </div>
    );
  return (
    <iframe
      key={frameKey}
      src={url}
      title={hostOf(url)}
      onLoad={onLoad}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
      referrerPolicy="no-referrer"
      className={cn(
        "absolute inset-0 size-full border-0 bg-white",
        !active && "hidden",
      )}
    />
  );
}
