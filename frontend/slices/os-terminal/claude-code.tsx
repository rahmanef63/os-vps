"use client";

import { Terminal } from "./app";

// Claude Code app — opens a live PTY that immediately runs the Claude Code CLI
// with permission prompts skipped (`claude --dangerously-skip-permissions`): a
// one-tap agentic coding session on the host. Falls back to the plain terminal
// banner if the PTY can't open (exec mode can't auto-run the CLI).
export default function ClaudeCodeApp() {
  return <Terminal initialCommand="claude --dangerously-skip-permissions" />;
}
