"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuickLinks, type QuickLink } from "../registry/capabilities";

// Squircle tile holding a website favicon (a "web app" shortcut). Shares
// AppIcon's --shell-icon-* tokens + .shell-icon-tile squircle so quicklinks sit
// naturally among real apps in the dock, Launchpad and mobile grid. White tile
// (favicons assume a light ground); a hairline ring keeps it defined on any
// wallpaper. Favicon bytes are external + dynamic, so a raw <img> (not
// next/Image) keeps appshell brand/host-free.
export function QuicklinkIcon({ link, className }: { link: QuickLink; className?: string }) {
  const { faviconUrl } = useQuickLinks();
  const src = faviconUrl(link.url);
  const [err, setErr] = useState(false);
  return (
    <span
      className={cn(
        "shell-icon-tile relative grid size-full place-items-center overflow-hidden bg-white text-zinc-500",
        className,
      )}
      style={{ boxShadow: "var(--shell-icon-shadow)" }}
    >
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-black/10" />
      {src && !err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={32}
          height={32}
          loading="lazy"
          decoding="async"
          className="relative z-[1] size-[58%] object-contain"
          onError={() => setErr(true)}
        />
      ) : (
        <Globe className="relative z-[1] size-[52%]" strokeWidth={2.1} />
      )}
    </span>
  );
}
