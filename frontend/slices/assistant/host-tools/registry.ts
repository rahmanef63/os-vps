import type { AiTool } from "../lib/host";
import type { HostTool } from "./types";
import { HOST_TOOLS } from "./catalog";

// The single source of truth for the callable host tools. Add a tool = append to
// catalog.ts; it flows into the schema + the binding with no other wiring.
const BY_NAME = new Map(HOST_TOOLS.map((t) => [t.name, t]));

export function findHostTool(name: string): HostTool | undefined {
  return BY_NAME.get(name);
}

// Anthropic `tools` array derived from the catalog (sent to /api/assistant).
export const HOST_AI_TOOLS: AiTool[] = HOST_TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.parameters,
}));

// System prompt for the host agent — states the approval contract so the model
// behaves well around denials. Passed per-request to /api/assistant (overrides
// the route's neutral default). A live/mock mode note is appended by the caller.
export const HOST_SYSTEM = [
  "You are Alfa, operating a real headless VPS through tools.",
  "READ tools (fs.list, fs.read, fs.search, sys.stats, apps.list, memory.remember) run immediately.",
  "Use memory.remember to save lasting facts or preferences the user shares, so you recall them in future chats — not one-off task details.",
  "WRITE tools (fs.write, fs.mkdir, fs.move) and exec.run require the user to APPROVE each call, and may be DENIED.",
  "If a call is denied, do NOT retry the same call — explain, or propose an alternative and ask.",
  "Read/inspect before you mutate. Prefer one dependent call at a time. Confirm concisely when done; no meta-commentary.",
].join(" ");
