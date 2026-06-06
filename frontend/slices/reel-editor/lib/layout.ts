// Editor workspace layout = a config-driven split tree. The three panes
// (preview / properties / timeline) are position-agnostic; a LayoutNode tree
// decides how they're arranged and sized, so "relayout" = swap a preset (or
// drag a divider), never a JSX rewrite. Sizes are percentages of the parent
// split and are persisted per-preset by react-resizable-panels (autoSaveId).

export type PaneId = "preview" | "properties" | "timeline" | "files";

export type LayoutNode =
  | { type: "pane"; pane: PaneId; size?: number; minSize?: number }
  | { type: "split"; dir: "row" | "col"; size?: number; minSize?: number; children: LayoutNode[] };

export type LayoutPreset = { id: string; label: string; root: LayoutNode };

export const LAYOUTS: LayoutPreset[] = [
  {
    id: "edit",
    label: "Edit (default)",
    root: {
      type: "split",
      dir: "col",
      children: [
        {
          type: "split",
          dir: "row",
          size: 74,
          children: [
            { type: "pane", pane: "preview", size: 72, minSize: 30 },
            { type: "pane", pane: "properties", size: 28, minSize: 12 },
          ],
        },
        { type: "pane", pane: "timeline", size: 26, minSize: 12 },
      ],
    },
  },
  {
    id: "panel-left",
    label: "Panel left",
    root: {
      type: "split",
      dir: "row",
      children: [
        { type: "pane", pane: "properties", size: 22, minSize: 12 },
        {
          type: "split",
          dir: "col",
          size: 78,
          children: [
            { type: "pane", pane: "preview", size: 70, minSize: 30 },
            { type: "pane", pane: "timeline", size: 30, minSize: 12 },
          ],
        },
      ],
    },
  },
  {
    id: "timeline",
    label: "Timeline focus",
    root: {
      type: "split",
      dir: "col",
      children: [
        {
          type: "split",
          dir: "row",
          size: 46,
          children: [
            { type: "pane", pane: "preview", size: 70, minSize: 25 },
            { type: "pane", pane: "properties", size: 30, minSize: 12 },
          ],
        },
        { type: "pane", pane: "timeline", size: 54, minSize: 20 },
      ],
    },
  },
  {
    id: "preview",
    label: "Preview focus",
    root: {
      type: "split",
      dir: "col",
      children: [
        { type: "pane", pane: "preview", size: 80, minSize: 40 },
        {
          type: "split",
          dir: "row",
          size: 20,
          children: [
            { type: "pane", pane: "timeline", size: 68, minSize: 20 },
            { type: "pane", pane: "properties", size: 32, minSize: 12 },
          ],
        },
      ],
    },
  },
];

// Content left/right: hero preview on one side; the other side stacks
// files + properties on top and the track timeline below ("right" = mirrored).
const contentSide = (flip: boolean): LayoutNode => {
  const stack: LayoutNode = {
    type: "split",
    dir: "col",
    size: 44,
    children: [
      {
        type: "split",
        dir: "row",
        size: 55,
        children: [
          { type: "pane", pane: "files", size: 50, minSize: 14 },
          { type: "pane", pane: "properties", size: 50, minSize: 14 },
        ],
      },
      { type: "pane", pane: "timeline", size: 45, minSize: 15 },
    ],
  };
  const preview: LayoutNode = { type: "pane", pane: "preview", size: 56, minSize: 30 };
  return { type: "split", dir: "row", children: flip ? [stack, preview] : [preview, stack] };
};

LAYOUTS.push(
  { id: "content-left", label: "Content left (files + inspector)", root: contentSide(false) },
  { id: "content-right", label: "Content right (flipped)", root: contentSide(true) },
);

export const DEFAULT_LAYOUT = "edit";
export const findLayout = (id: string): LayoutPreset => LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
