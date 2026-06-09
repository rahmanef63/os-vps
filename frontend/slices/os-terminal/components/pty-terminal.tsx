"use client";
// audit-allow-hex: same terminal glass palette as the exec emulator.

import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef, useState } from "react";
import type { Terminal } from "@xterm/xterm";
import { startPty, type PtyHandle, type PtyStatus } from "../lib/use-pty";

// Real interactive shell (live mode): xterm.js wired to /api/v1/term/*.
// xterm is dynamic-imported inside the effect — it touches the DOM at
// construction and must never run during SSR. `gen` bumps re-run the whole
// effect for a fresh session (Restart).
export default function PtyTerminal({ onFallback }: { onFallback: (msg: string) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<PtyStatus>({ kind: "connecting" });
  const [gen, setGen] = useState(0);
  const onFallbackRef = useRef(onFallback);
  useEffect(() => {
    onFallbackRef.current = onFallback;
  });

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let disposed = false;
    let term: Terminal | null = null;
    let handle: PtyHandle | null = null;
    let ro: ResizeObserver | null = null;
    let resizeT: ReturnType<typeof setTimeout> | undefined;
    setStatus({ kind: "connecting" });

    (async () => {
      const [{ Terminal: XTerm }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
      if (disposed) return;
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const mono = getComputedStyle(document.documentElement)
        .getPropertyValue("--font-mono")
        .trim();
      term = new XTerm({
        cursorBlink: true,
        fontSize: coarse ? 14 : 12.5,
        fontFamily: mono || "ui-monospace, monospace",
        scrollback: 5000,
        theme: {
          background: "#0d0e12",
          foreground: "#dfe3ea",
          cursor: "#5be0c8",
          selectionBackground: "#2e3340",
        },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(el);
      fit.fit();
      try {
        handle = await startPty({
          cols: term.cols,
          rows: term.rows,
          onData: (bytes) => term?.write(bytes),
          onStatus: (s) => {
            if (!disposed) setStatus(s);
          },
        });
      } catch (e) {
        if (disposed) return;
        const msg = e instanceof Error ? e.message : String(e);
        setStatus({ kind: "error", message: msg });
        onFallbackRef.current(msg); // app.tsx swaps in the exec terminal
        return;
      }
      if (disposed) {
        handle.dispose();
        return;
      }
      term.onData((d) => handle?.write(d));
      term.onBinary((d) => handle?.write(d));
      ro = new ResizeObserver(() => {
        clearTimeout(resizeT);
        resizeT = setTimeout(() => {
          if (!term || !handle) return;
          fit.fit();
          handle.resize(term.cols, term.rows);
        }, 80);
      });
      ro.observe(el);
      term.focus();
    })();

    return () => {
      disposed = true;
      clearTimeout(resizeT);
      ro?.disconnect();
      handle?.dispose(); // kills the server-side shell too
      term?.dispose();
    };
  }, [gen]);

  return (
    <div className="flex h-full w-full flex-col bg-[#0d0e12] [padding-bottom:var(--sai-bottom)]">
      <StatusBar
        status={status}
        onRestart={() => setGen((g) => g + 1)}
        onBasic={() => onFallbackRef.current(statusLabel(status))}
      />
      <div className="min-h-0 flex-1 p-1.5">
        <div ref={hostRef} className="h-full w-full" />
      </div>
    </div>
  );
}

function statusLabel(s: PtyStatus): string {
  if (s.kind === "exited") return `shell exited${s.code !== null ? ` (code ${s.code})` : ""}`;
  if (s.kind === "error") return s.message;
  return s.kind;
}

// Slim banner in the same visual language as the exec terminal's mode banner.
function StatusBar({
  status,
  onRestart,
  onBasic,
}: {
  status: PtyStatus;
  onRestart: () => void;
  onBasic: () => void;
}) {
  const base = "flex select-none items-center gap-2 px-2 py-1 text-[11px] font-semibold";
  if (status.kind === "live")
    return (
      <div className={base} style={{ color: "#0d0e12", background: "#5be0c8" }}>
        ● LIVE PTY — interactive shell on this host
      </div>
    );
  if (status.kind === "connecting")
    return (
      <div className={base} style={{ color: "#0d0e12", background: "#f5c451" }}>
        ● connecting to the host shell…
      </div>
    );
  return (
    <div
      className={base}
      style={
        status.kind === "exited"
          ? { color: "#dfe3ea", background: "#3a3f4d" }
          : { color: "#fff", background: "#a14545" }
      }
    >
      <span className="min-w-0 flex-1 truncate">○ {statusLabel(status)}</span>
      <button onClick={onRestart} className="rounded bg-white/15 px-2 py-0.5 hover:bg-white/25">
        Restart
      </button>
      <button onClick={onBasic} className="rounded bg-white/15 px-2 py-0.5 hover:bg-white/25">
        Basic mode
      </button>
    </div>
  );
}
