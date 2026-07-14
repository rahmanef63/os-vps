"use client";

import { useEffect, useState } from "react";

/* Shared shell clock (Android home + Shade datetime, iOS status strip, …).
   30s tick — minute precision is all any mode shows. */
export function Clock({ mode }: { mode: "time" | "big" | "date" | "datetime" }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  if (mode === "big") return <div className="text-5xl font-medium tracking-tight">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>;
  if (mode === "date") return <div className="text-sm text-muted-foreground">{now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}</div>;
  if (mode === "datetime") return <span>{now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })} · {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>;
  return <span>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>;
}
