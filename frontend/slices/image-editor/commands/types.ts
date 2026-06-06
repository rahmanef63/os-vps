import type { useEditor } from "../lib/store";

// The live editor context (every store action) — commands run against this.
export type EditorCtx = ReturnType<typeof useEditor>;

// A JSON Schema object (Anthropic tool `input_schema` shape). Kept minimal: we
// only emit `object` schemas with flat primitive/enum properties.
export type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

// One AI-callable editor operation. `run` mutates the live store and returns a
// short, serialisable result the model sees as the tool_result (so it can react
// — e.g. "added layer L4 (text)"). Throw on bad input; the wrapper reports it.
export type EditorCommand = {
  /** Dotted, namespaced name, e.g. "layer.add". Unique across the registry. */
  name: string;
  description: string;
  parameters: JsonSchema;
  run: (ctx: EditorCtx, args: Record<string, unknown>) => string | Promise<string>;
};

// Anthropic tool definition derived from a command (sent to the API).
export type AnthropicTool = {
  name: string;
  description: string;
  input_schema: JsonSchema;
};
