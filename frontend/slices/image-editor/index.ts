// Public barrel — consumers import ONLY from here.
export { ImageEditor } from "./image-editor";
export type { ImageEditorProps, EditorApi } from "./image-editor";

// Store (for embedding the editor in a custom chrome).
export { EditorProvider, useEditor } from "./lib/store";
export type { Brush } from "./lib/store";

// Model + types.
export { blankDoc, createLayer, ASPECT_PRESETS, FONT_FAMILIES, ADJ_DEFAULT, STYLE_DEFAULT } from "./lib/model";
export type {
  Doc,
  Layer,
  LayerKind,
  LayerStyle,
  Adjustments,
  BlendMode,
  DropShadow,
  OuterGlow,
  Stroke,
  Tool,
  Transform,
} from "./lib/types";
export { BLEND_MODES } from "./lib/types";

// Free, in-browser background removal (@imgly) + export helpers.
export { removeImageBackground } from "./lib/bg-removal";
export type { BgProgress } from "./lib/bg-removal";
export { exportStage, stageToDataURL, downloadDataURL } from "./lib/export";
export type { ExportFormat } from "./lib/export";

export { imageEditorConfig } from "./config";
export type { ImageEditorConfig } from "./config";

// AI function-calling: the command registry + the live-store binding hook. Every
// editor operation is exposed as a named, schema'd command an AI can call.
export { EDITOR_COMMANDS, EDITOR_TOOLS, findCommand } from "./commands/registry";
export { useEditorCommands } from "./commands/use-editor-commands";
export type { EditorCommand, AnthropicTool } from "./commands/types";
export type { ToolInvocation, ToolOutcome } from "./commands/use-editor-commands";
export { runEditorAgent } from "./lib/ai-agent";
