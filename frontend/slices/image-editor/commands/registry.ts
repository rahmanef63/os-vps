import type { AnthropicTool, EditorCommand } from "./types";
import { layerCommands } from "./layer.commands";
import { adjustCommands } from "./adjust.commands";
import { styleCommands } from "./style.commands";
import { transformCommands } from "./transform.commands";
import { documentCommands } from "./document.commands";
import { toolCommands } from "./tool.commands";
import { exportCommands } from "./export.commands";

// The single source of truth for every AI-callable editor operation. Add a
// command = append to its domain file; it flows into the tools schema + invoke
// with no other wiring. Adding a domain = import + spread it here.
export const EDITOR_COMMANDS: EditorCommand[] = [
  ...documentCommands,
  ...layerCommands,
  ...transformCommands,
  ...toolCommands,
  ...adjustCommands,
  ...styleCommands,
  ...exportCommands,
];

const BY_NAME = new Map(EDITOR_COMMANDS.map((c) => [c.name, c]));

export function findCommand(name: string): EditorCommand | undefined {
  return BY_NAME.get(name);
}

// Anthropic `tools` array derived from the registry (sent to /api/assistant).
export const EDITOR_TOOLS: AnthropicTool[] = EDITOR_COMMANDS.map((c) => ({
  name: c.name,
  description: c.description,
  input_schema: c.parameters,
}));
