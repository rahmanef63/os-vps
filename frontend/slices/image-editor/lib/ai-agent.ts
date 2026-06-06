import { streamAgentTurn, type AgentMsg, type AiTool } from "./host";
import type { ToolInvocation, ToolOutcome } from "../commands/use-editor-commands";

export type AgentEvents = {
  /** Streaming text deltas for the current assistant turn. */
  onDelta: (chunk: string) => void;
  /** A tool the model called, with the local execution outcome. */
  onTool: (name: string, input: Record<string, unknown>, outcome: ToolOutcome) => void;
};

// Drives a function-calling conversation that operates the editor: stream a
// turn → run any tool_use locally against the live store → feed the results
// back → repeat until the model stops calling tools (or the turn cap is hit).
// Returns the extended history so the caller can keep the thread going.
export async function runEditorAgent(
  history: AgentMsg[],
  tools: AiTool[],
  invoke: (call: ToolInvocation) => Promise<ToolOutcome>,
  ev: AgentEvents,
  maxTurns = 8,
): Promise<{ history: AgentMsg[]; text: string }> {
  const msgs = [...history];
  let lastText = "";
  for (let i = 0; i < maxTurns; i++) {
    const { text, toolUses } = await streamAgentTurn(msgs, tools, ev.onDelta);
    msgs.push({ role: "assistant", text, toolUses });
    if (text) lastText = text;
    if (toolUses.length === 0) break;
    const results = [];
    for (const tu of toolUses) {
      const outcome = await invoke({ name: tu.name, input: tu.input });
      ev.onTool(tu.name, tu.input, outcome);
      results.push({ id: tu.id, content: outcome.result, isError: !outcome.ok });
    }
    msgs.push({ role: "tool", results });
  }
  return { history: msgs, text: lastText };
}
