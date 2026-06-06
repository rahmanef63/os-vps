"use client";

// os-vps side of the slice's host seam: everything project-specific the
// slice touches re-exports from the shell + OsApi here. The rr catalog
// copy replaces this file with a self-contained version (demo exec +
// no-op inspector) and bundles the Create-App flow in-slice.

export type { AppProps, AppDescriptor } from "@/features/os-shell";
export { usePublishInspector } from "@/features/os-shell";
export { useOsApi } from "@/lib/os-api";
