"use client";

import { useEffect, useState } from "react";

// In-slice mobile check (rr slices may not import @/hooks/*). Matches a phone-ish
// width; drives the desktop-dock vs mobile-sheet layout switch.
export function useIsMobile(breakpoint = 768): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [breakpoint]);
  return mobile;
}
