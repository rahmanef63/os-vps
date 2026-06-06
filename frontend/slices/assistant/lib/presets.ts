import type { Agent, Automation, Skill } from "./types";

// Icon names map to lucide icons in components/icon-map.ts. Colors are Tailwind
// palette utility classes (theme tokens, not raw hex) applied to avatars.
export const SKILL_ICONS = [
  "folder",
  "globe",
  "film",
  "image",
  "gauge",
  "settings",
  "code",
  "cloud",
  "music",
  "grid",
  "file",
  "sparkles",
  "terminal",
] as const;

export const AGENT_COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-teal-500",
  "bg-pink-500",
  "bg-emerald-500",
  "bg-amber-500",
] as const;

export const SKILL_COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-emerald-500",
  "bg-fuchsia-500",
] as const;

export const PRESET_SKILLS: Skill[] = [
  {
    id: "sk_files",
    builtin: true,
    name: "File Ops",
    glyph: "folder",
    color: "bg-blue-500",
    instructions:
      "Organize the filesystem: create, rename, move, delete, search and open files and folders.",
    tools: [
      "files.list",
      "files.create_folder",
      "files.create_file",
      "files.rename",
      "files.move",
      "files.delete",
      "files.open",
      "files.search",
    ],
    starters: ["Create a folder Renders in /Media", "List everything in /Projects", "Find files named promo"],
  },
  {
    id: "sk_web",
    builtin: true,
    name: "Web Research",
    glyph: "globe",
    color: "bg-blue-500",
    instructions: "Browse the web to look things up. Open URLs, run searches, and bookmark useful pages.",
    tools: ["browser.open", "browser.new_tab", "browser.bookmark", "files.create_file"],
    starters: ["Open browser to wikipedia.org", "Search the web for remotion templates", "Bookmark this page"],
  },
  {
    id: "sk_sys",
    builtin: true,
    name: "Sysadmin",
    glyph: "gauge",
    color: "bg-emerald-500",
    instructions:
      "Operate the VPS: read system stats, list processes, run shell commands, and tune appearance/settings.",
    tools: [
      "system.stats",
      "system.processes",
      "terminal.run",
      "system.open_monitor",
      "settings.set_theme",
      "settings.set_accent",
      "apps.launch",
    ],
    starters: ["Show system stats", "Run df then ps", "Switch to dark mode"],
  },
];

export const PRESET_AGENTS: Agent[] = [
  {
    id: "ag_alfa",
    builtin: true,
    name: "Alfa",
    glyph: "sparkles",
    color: "bg-violet-500",
    persona:
      "Alfa is the os-vps generalist — calm, precise, and proactive. It chains tools to finish multi-step tasks and narrates what it does.",
    allTools: true,
    skills: [],
  },
  {
    id: "ag_ops",
    builtin: true,
    name: "Ops",
    glyph: "gauge",
    color: "bg-emerald-500",
    persona: "A no-nonsense sysadmin. Prefers concrete shell commands and explains the risk before destructive ops.",
    allTools: false,
    skills: ["sk_sys", "sk_files"],
  },
];

export const PRESET_AUTOMATIONS: Automation[] = [
  {
    id: "au_setup",
    builtin: true,
    name: "Daily Setup",
    glyph: "gauge",
    color: "bg-emerald-500",
    agentId: "ag_alfa",
    steps: [
      { tool: "files.create_folder", argText: "/Projects" },
      { tool: "apps.launch", argText: "files" },
      { tool: "system.stats", argText: "" },
    ],
  },
];
