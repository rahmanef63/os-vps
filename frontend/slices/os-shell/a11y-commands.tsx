"use client";

import { useEffect, useRef } from "react";
import { registerCommands, toast } from "@/features/appshell";
import { FONT_SCALES, useAppearance } from "@/lib/appearance";

// Accessibility palette commands over the Topside appearance store — text-size
// steps + high contrast + reduce transparency. Rendered (not imported for side
// effects) because the store is React context; a ref keeps the command
// closures reading the latest tweaks without re-registering.
export function A11yCommands() {
  const { tweaks, setTweaks } = useAppearance();
  const ref = useRef({ tweaks, setTweaks });
  useEffect(() => {
    ref.current = { tweaks, setTweaks };
  });

  useEffect(() => {
    const scales = FONT_SCALES as readonly number[];
    const stepFont = (delta: 1 | -1) => {
      const { tweaks: t, setTweaks: set } = ref.current;
      const cur = scales.indexOf(t.fontScale);
      const next = scales[Math.min(scales.length - 1, Math.max(0, (cur === -1 ? 1 : cur) + delta))];
      set({ fontScale: next });
      toast(`Text size ${Math.round(next * 100)}%`);
    };
    return registerCommands("a11y", [
      { id: "a11y:font-up", label: "Increase text size", hint: "Accessibility",
        keywords: "font scale bigger zoom a11y", run: () => stepFont(1) },
      { id: "a11y:font-down", label: "Decrease text size", hint: "Accessibility",
        keywords: "font scale smaller zoom a11y", run: () => stepFont(-1) },
      { id: "a11y:contrast", label: "Toggle high contrast", hint: "Accessibility",
        keywords: "a11y borders visibility contrast",
        run: () => {
          const { tweaks: t, setTweaks: set } = ref.current;
          set({ highContrast: !t.highContrast });
          toast(!t.highContrast ? "High contrast on" : "High contrast off");
        } },
      { id: "a11y:glass", label: "Toggle reduce transparency", hint: "Accessibility",
        keywords: "a11y glass blur transparency motion",
        run: () => {
          const { tweaks: t, setTweaks: set } = ref.current;
          set({ reduceGlass: !t.reduceGlass });
          toast(!t.reduceGlass ? "Reduced transparency on" : "Reduced transparency off");
        } },
    ]);
  }, []);

  return null;
}
