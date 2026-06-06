"use client";

import { useMemo } from "react";
import { useEditor } from "../lib/store";
import { EDITOR_TOOLS, findCommand } from "./registry";
import type { AnthropicTool } from "./types";

export type ToolInvocation = { name: string; input: Record<string, unknown> };
export type ToolOutcome = { ok: boolean; result: string };

// Binds the static command registry to the LIVE editor store. Returns the tool
// schemas (for the AI request) + `invoke`, which runs a command against the
// current context. Errors are caught and returned as a failed outcome so the
// model can read the message and recover instead of crashing the chat.
export function useEditorCommands(): {
  tools: AnthropicTool[];
  invoke: (call: ToolInvocation) => Promise<ToolOutcome>;
} {
  const ctx = useEditor();
  return useMemo(
    () => ({
      tools: EDITOR_TOOLS,
      invoke: async ({ name, input }) => {
        const cmd = findCommand(name);
        if (!cmd) return { ok: false, result: `unknown command "${name}"` };
        try {
          const result = await cmd.run(ctx, input ?? {});
          return { ok: true, result };
        } catch (e) {
          return { ok: false, result: e instanceof Error ? e.message : "command failed" };
        }
      },
    }),
    [ctx],
  );
}
