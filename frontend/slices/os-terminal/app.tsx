"use client";
// audit-allow-hex: terminal glass chrome palette is the slice's design, not themable tokens.

import { useState } from "react";
import { useOsApi } from "./lib/host";
import ExecTerminal from "./components/exec-terminal";
import PtyTerminal from "./components/pty-terminal";

// Terminal entry: LIVE mode gets the real interactive PTY (xterm.js over
// /api/v1/term/* — vim/top/ssh/tab-completion all work); mock/demo keeps the
// simulated shell untouched. If the PTY can't open (route error, session cap,
// old server build), we show why and fall back to the legacy one-shot exec
// terminal so live never regresses below the old behaviour.
// `initialCommand` (optional) is written to the live PTY once it connects — used
// by the Claude Code app to auto-run `claude` on open. Normal Terminal passes none.
export function Terminal({ initialCommand }: { initialCommand?: string } = {}) {
  const api = useOsApi();
  const [ptyError, setPtyError] = useState<string | null>(null);
  // A mode flip (Settings → Server) re-arms the PTY attempt (render-time
  // state adjustment — the React-endorsed "derive from prop change" pattern).
  const [prevMode, setPrevMode] = useState(api.mode);
  if (prevMode !== api.mode) {
    setPrevMode(api.mode);
    setPtyError(null);
  }

  if (api.mode === "live" && ptyError === null)
    return <PtyTerminal onFallback={setPtyError} initialCommand={initialCommand} />;

  return (
    <div className="flex h-full w-full flex-col">
      {api.mode === "live" && ptyError !== null && (
        <div
          className="flex select-none items-center gap-2 px-2 py-1 text-[11px] font-semibold"
          style={{ color: "#fff", background: "#a14545" }}
        >
          <span className="min-w-0 flex-1 truncate">
            PTY unavailable: {ptyError} — basic exec mode
          </span>
          <button
            onClick={() => setPtyError(null)}
            className="rounded bg-white/15 px-2 py-0.5 hover:bg-white/25"
          >
            Retry PTY
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <ExecTerminal />
      </div>
    </div>
  );
}

// Default export = the plain Terminal (the app-manifest loader expects a default).
export default function TerminalApp() {
  return <Terminal />;
}
