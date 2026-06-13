"use client";

// os-vps side of the slice's host seam: everything project-specific the
// slice touches re-exports from the shell + OsApi here. The rr catalog
// copy replaces this file with a self-contained version (injectable
// TerminalOsApi + no-op inspector) — every other file is line-identical.

export type { AppDescriptor } from "@/features/os-shell";
export { usePublishInspector } from "@/features/os-shell";
export { useOsApi, type FsEntry } from "@/features/os-shell";
export type { OsApi as TerminalOsApi } from "@/features/os-shell";
export { fmtGiBPair, fmtUptime } from "@/features/os-shell";
