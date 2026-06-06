"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { FeatureDescriptor, SlotRegion } from "./types";

// Features are injected by the consumer's manifest, never imported by the core.
const FeatureContext = createContext<FeatureDescriptor[]>([]);

export function FeatureRegistryProvider({
  features,
  children,
}: {
  features: FeatureDescriptor[];
  children: ReactNode;
}) {
  return <FeatureContext.Provider value={features}>{children}</FeatureContext.Provider>;
}

export function useFeatures(): FeatureDescriptor[] {
  return useContext(FeatureContext);
}

/**
 * Renders every registered feature's component for `region`, in manifest order.
 * Surfaces place <Slot region="…" /> where a region lives; the content is
 * whatever features contributed — so the shell composes itself from config.
 */
export function Slot({ region }: { region: SlotRegion }) {
  const features = useFeatures();
  return (
    <>
      {features.map((f) => {
        const C = f.slots?.[region];
        return C ? <C key={f.id} /> : null;
      })}
    </>
  );
}
