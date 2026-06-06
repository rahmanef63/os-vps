"use client";

// Favicon with graceful fallback to a globe glyph when the page has no icon
// (or the input is not an http URL).
import { useEffect, useState } from "react";
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
  const [err, setErr] = useState(false);
  const src = faviconFor(url);

  // Reset the error flag whenever we point at a different URL.
  useEffect(() => setErr(false), [url]);

  if (!src || err) {
    return <Globe className={cn("size-3.5 text-muted-foreground", className)} />;
  }
  return (
    <Image
      src={src}
      alt=""
      width={14}
      height={14}
      onError={() => setErr(true)}
      className={cn("size-3.5 rounded-[3px]", className)}
    />
  );
}
