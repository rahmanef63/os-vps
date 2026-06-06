import type { Agent, Skill, Tool, ToolGroup } from "./types";

// Grouped tool catalog reused by the Agents / Skills / Automations editors.
// Mirrors the mock OS surface; these are declarative descriptors only — nothing
// here executes anything (automations just narrate).
export const GROUP_META: Record<
  ToolGroup,
  { label: string; icon: string }
> = {
  files: { label: "File system", icon: "folder" },
  rendering: { label: "Rendering", icon: "image" },
  apps: { label: "Apps", icon: "grid" },
  media: { label: "Media", icon: "image" },
  system: { label: "System", icon: "gauge" },
  editor: { label: "Editor", icon: "code" },
  terminal: { label: "Terminal", icon: "terminal" },
  browser: { label: "Browser", icon: "globe" },
  settings: { label: "Settings", icon: "settings" },
  video: { label: "Video", icon: "film" },
};

export const GROUP_ORDER: ToolGroup[] = [
  "files",
  "rendering",
  "apps",
  "media",
  "system",
  "editor",
  "terminal",
  "browser",
  "settings",
  "video",
];

const T = (
  id: string,
  group: ToolGroup,
  name: string,
  desc: string,
  params: string[] = [],
): Tool => ({ id, group, name, desc, params });

export const OS_TOOLS: Tool[] = [
  T("files.list", "files", "List", "List a directory's contents.", ["path"]),
  T("files.create_folder", "files", "New folder", "Create a folder.", ["path", "name"]),
  T("files.create_file", "files", "New file", "Create a file.", ["path", "name"]),
  T("files.rename", "files", "Rename", "Rename a file or folder.", ["path", "name"]),
  T("files.move", "files", "Move", "Move a file or folder.", ["from", "to"]),
  T("files.delete", "files", "Delete", "Delete a file or folder.", ["path"]),
  T("files.open", "files", "Open", "Open a file.", ["path"]),
  T("files.search", "files", "Search", "Search files by name.", ["query"]),

  T("render.snapshot", "rendering", "Snapshot", "Capture a window snapshot.", ["target"]),
  T("render.export", "rendering", "Export frame", "Export the current frame.", ["format"]),

  T("apps.launch", "apps", "Launch app", "Open an app window.", ["app"]),
  T("apps.close", "apps", "Close app", "Close an app window.", ["app"]),
  T("apps.list", "apps", "List apps", "List open apps."),

  T("media.open", "media", "Open editor", "Open Image Editor."),
  T("media.set_aspect", "media", "Set aspect", "Set canvas aspect.", ["ratio"]),
  T("media.add_text", "media", "Add text", "Add a text layer.", ["text"]),
  T("media.add_sticker", "media", "Add sticker", "Add a sticker.", ["emoji"]),
  T("media.apply_filter", "media", "Apply filter", "Apply an image filter.", ["filter"]),
  T("media.export", "media", "Export", "Export the design.", ["format"]),

  T("system.stats", "system", "Stats", "Read system stats."),
  T("system.processes", "system", "Processes", "List running processes."),
  T("system.open_monitor", "system", "Monitor", "Open the system monitor."),

  T("editor.open", "editor", "Open file", "Open a file in the editor.", ["path"]),
  T("editor.edit", "editor", "Edit", "Apply an edit to the open file.", ["patch"]),
  T("editor.save", "editor", "Save", "Save the open file."),

  T("terminal.run", "terminal", "Run command", "Run a shell command.", ["command"]),
  T("terminal.open", "terminal", "Open shell", "Open a terminal."),

  T("browser.open", "browser", "Open URL", "Open a URL.", ["url"]),
  T("browser.new_tab", "browser", "New tab", "Open a new tab.", ["url"]),
  T("browser.bookmark", "browser", "Bookmark", "Bookmark the current page."),

  T("settings.set_theme", "settings", "Set theme", "Switch theme.", ["theme"]),
  T("settings.set_accent", "settings", "Set accent", "Set accent color.", ["color"]),
  T("settings.set_wallpaper", "settings", "Set wallpaper", "Set wallpaper.", ["id"]),
  T("settings.open", "settings", "Open settings", "Open the settings app."),

  T("video.open", "video", "Open editor", "Open the reel editor."),
  T("video.set_ratio", "video", "Set ratio", "Set the aspect ratio.", ["ratio"]),
  T("video.add_title", "video", "Add title", "Add a title.", ["text"]),
  T("video.split", "video", "Split", "Split at the playhead."),
  T("video.effect", "video", "Effect", "Add a motion effect.", ["effect"]),
  T("video.render", "video", "Render", "Render the reel."),
];

const BY_ID = new Map(OS_TOOLS.map((t) => [t.id, t]));
export const toolById = (id: string): Tool | undefined => BY_ID.get(id);

// Generalist agents get every tool; otherwise the union of their skills' tools.
export function toolsForAgent(agent: Agent | undefined, skills: Skill[]): Tool[] {
  if (!agent) return [];
  if (agent.allTools) return OS_TOOLS.slice();
  const ids = new Set<string>();
  for (const sid of agent.skills) {
    const s = skills.find((x) => x.id === sid);
    s?.tools.forEach((tid) => ids.add(tid));
  }
  return OS_TOOLS.filter((t) => ids.has(t.id));
}
