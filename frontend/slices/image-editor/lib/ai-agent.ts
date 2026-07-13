// The editor's agent loop is now the generic `runToolAgent` (lib/ai/agent-loop),
// shared with the assistant's host agent. This keeps the editor's import path +
// `runEditorAgent` name stable — the loop body and behaviour are identical.
export { runToolAgent as runEditorAgent, type AgentEvents } from "@/lib/ai/agent-loop";
