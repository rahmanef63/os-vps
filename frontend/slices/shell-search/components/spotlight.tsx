"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useApps,
  useSpotlightOpen,
  useShellAppearance,
  useShellSearch,
  openWindow,
  setSpotlightOpen,
  setLauncherOpen,
  minimizeAll,
  closeAll,
  toast,
  type AppDescriptor,
  type SearchHit,
} from "@/features/appshell";

type Command = {
  id: string;
  label: string;
  hint: string;
  run: () => void;
  app?: AppDescriptor;
};

// Subsequence match (typing "cdr" hits "Code Editor"). Cheap, no fuzzy lib.
function matches(q: string, label: string): boolean {
  if (!q) return true;
  const s = label.toLowerCase();
  let i = 0;
  for (const c of q.toLowerCase()) {
    i = s.indexOf(c, i);
    if (i === -1) return false;
    i++;
  }
  return true;
}

// Spotlight / ⌘K command palette — open apps + run shell actions from one box.
export function Spotlight() {
  const open = useSpotlightOpen();
  const apps = useApps();
  const search = useShellSearch();
  const { theme, setTheme } = useShellAppearance();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [folderHits, setFolderHits] = useState<SearchHit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced folder search under ~/projects (live) — opens Files at the hit.
  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setFolderHits([]);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      search(query)
        .then((h) => alive && setFolderHits(h))
        .catch(() => alive && setFolderHits([]));
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, search]);

  const commands = useMemo<Command[]>(() => {
    const appCmds: Command[] = apps.map((app) => ({
      id: `open:${app.id}`,
      label: app.title,
      hint: "App",
      app,
      run: () => openWindow(app.id, app.title, app.defaultSize, undefined, { multi: app.multi }),
    }));
    const actions: Command[] = [
      { id: "launchpad", label: "Open Launchpad", hint: "Action", run: () => setLauncherOpen(true) },
      { id: "minimize-all", label: "Minimize all windows", hint: "Action", run: minimizeAll },
      { id: "close-all", label: "Close all windows", hint: "Action", run: closeAll },
      {
        id: "theme",
        label: theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        hint: "Action",
        run: () => setTheme(theme === "dark" ? "light" : "dark"),
      },
    ];
    return [...appCmds, ...actions];
  }, [apps, theme, setTheme]);

  const results = useMemo(() => {
    const base = commands.filter((c) => matches(q, c.label));
    const folderCmds: Command[] = folderHits.map((h) => ({
      id: h.id,
      label: h.label,
      hint: h.hint ?? "Folder",
      run: h.run,
    }));
    return [...base, ...folderCmds];
  }, [commands, q, folderHits]);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      // focus after the open transition paints
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setSel((s) => Math.min(s, Math.max(0, results.length - 1)));
  }, [results.length]);

  if (!open) return null;

  const close = () => setSpotlightOpen(false);
  const runAt = (i: number) => {
    const cmd = results[i];
    if (!cmd) return;
    cmd.run();
    toast(cmd.app ? `Opened ${cmd.label}` : cmd.label);
    close();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return close();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => (s + 1) % Math.max(1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => (s - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAt(sel);
    }
  };

  return (
    <div
      className="absolute inset-0 z-[9000] flex items-start justify-center bg-black/20 pt-[18vh]"
      onClick={close}
    >
      <div
        className="glass w-full max-w-xl overflow-hidden rounded-2xl border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="Search apps, folders, actions…"
          className="w-full bg-transparent px-5 py-4 text-base outline-none placeholder:text-muted-foreground"
        />
        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto border-t border-border p-2">
            {results.map((c, i) => (
              <li key={c.id}>
                <Button
                  type="button"
                  variant="ghost"
                  onMouseMove={() => setSel(i)}
                  onClick={() => runAt(i)}
                  className={cn(
                    "h-auto flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm",
                    i === sel ? "bg-primary/15 text-foreground" : "text-foreground/80",
                  )}
                >
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-md text-xs font-bold text-white"
                    style={{ background: c.app?.gradient ?? "var(--accent)" }}
                  >
                    {c.app ? null : c.hint === "Folder" ? "📁" : "⚡"}
                  </span>
                  <span className="flex-1 truncate">{c.label}</span>
                  <span className="text-[11px] text-muted-foreground">{c.hint}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
        {results.length === 0 && (
          <p className="border-t border-border px-5 py-4 text-sm text-muted-foreground">
            No matches for “{q}”.
          </p>
        )}
      </div>
    </div>
  );
}
