"use client";

// os-vps side of the slice's host seam: everything project-specific the
// slice touches re-exports from the shell + the root AI stream here. The
// rr catalog copy replaces this file with a self-contained version
// (configureAssistantStream + typing demo stream + no-op inspector) —
// every other file is line-identical.

export type { AppDescriptor } from "@/features/os-shell";
export { usePublishInspector } from "@/features/os-shell";
export { streamReply, type WireMsg } from "@/lib/ai/stream";

// Host-tool execution seam: the OsApi port (fs/exec/sys/apps), the generic
// tool-agent loop, and the isomorphic destructive-command matcher (for the
// approval card's advisory badge). Confined here so the slice never reaches into
// @/lib or @/features directly — matching the image-editor pattern.
export { useOsApi, type OsApi } from "@/features/os-shell";
export {
  runToolAgent,
  type AgentMsg,
  type AiTool,
  type AgentEvents,
  type ToolInvocation,
  type ToolOutcome,
} from "@/lib/ai/agent-loop";
export { matchDestructive } from "@/lib/host/destructive-patterns";
