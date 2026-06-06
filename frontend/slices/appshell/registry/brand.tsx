"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Brand } from "./types";

// The consumer's brand (name / logo / default wallpaper). Generic chrome reads
// this instead of hardcoding strings, so the same shell renders any project.
const BrandContext = createContext<Brand>({ name: "App" });

export function BrandProvider({
  brand,
  children,
}: {
  brand: Brand;
  children: ReactNode;
}) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export function useBrand(): Brand {
  return useContext(BrandContext);
}
