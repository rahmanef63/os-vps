"use client";

// os-vps side of the slice's host seam: everything project-specific the
// slice touches re-exports from the shell + the root AI stream here. The
// rr catalog copy replaces this file with a self-contained version
// (configureAssistantStream + typing demo stream + no-op inspector) —
// every other file is line-identical.

export type { AppDescriptor } from "@/features/os-shell";
export { usePublishInspector } from "@/features/os-shell";
export { streamReply, type WireMsg } from "@/lib/ai/stream";
