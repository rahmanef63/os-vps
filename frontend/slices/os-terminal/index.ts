import { SquareTerminal, Bot } from "lucide-react";
import type { AppDescriptor } from "@/features/os-shell";

export const osTerminalApp: AppDescriptor = {
  id: "os-terminal",
  title: "Terminal",
  icon: SquareTerminal,
  gradient: "linear-gradient(160deg,#3a3a40,#111114)",
  load: () => import("./app"),
  defaultSize: { w: 640, h: 400 },
};

// Claude Code — a PTY that auto-runs `claude --dangerously-skip-permissions`.
export const claudeCodeApp: AppDescriptor = {
  id: "claude-code",
  title: "Claude Code",
  icon: Bot,
  gradient: "linear-gradient(160deg,#d97757,#8a4a30)",
  load: () => import("./claude-code"),
  defaultSize: { w: 760, h: 480 },
};
