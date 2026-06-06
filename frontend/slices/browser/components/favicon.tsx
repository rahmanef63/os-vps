"use client";

// Favicon with graceful fallback to a globe glyph when the page has no icon
// (or the input is not an http URL).
import { useState } from "react";
import Image from "next/image";
import { Globe } from "lucide-react";
import { faviconFor } from "../lib/url";
import { cn } from "@/lib/utils";

export function Favicon({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  // Remember WHICH src failed — a different URL derives back to "no error"
  // without an effect-driven reset (react-hooks/set-state-in-effect).
  const [errSrc, setErrSrc] = useState<string | null>(null);
  const src = faviconFor(url);
  const err = src !== null && errSrc === src;

  if (!src || err) {
    return <Globe className={cn("size-3.5 text-muted-foreground", className)} />;
  }
  return (
    <Image
      src={src}
      alt=""
      width={14}
      height={14}
      onError={() => setErrSrc(src)}
      className={cn("size-3.5 rounded-[3px]", className)}
    />
  );
}
