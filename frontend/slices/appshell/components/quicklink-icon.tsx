"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuickLinks, type QuickLink } from "../registry/capabilities";

// macOS-style squircle tile holding a website favicon (a "web app" shortcut).
// Mirrors AppIcon's shadow/ring so quicklinks sit naturally among real apps in
// the dock, Launchpad and mobile grid. Favicon bytes are external + dynamic, so
// a raw <img> (not next/Image) keeps appshell brand/host-free.
export function QuicklinkIcon({ link, className }: { link: QuickLink; className?: string }) {
  const { faviconUrl } = useQuickLinks();
  const src = faviconUrl(link.url);
  const [err, setErr] = useState(false);
  return (
    <span
      className={cn(
        "relative grid size-full place-items-center overflow-hidden rounded-[var(--radius-icon)] bg-white text-zinc-500",
        "shadow-[0_1px_2px_rgba(0,0,0,0.2),0_4px_10px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.12)]",
        className,
      )}
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
