"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useApps,
  useCommands,
  useSpotlightOpen,
  useShellAppearance,
  useShellSearch,
  openWindow,
  setSpotlightOpen,
  setLauncherOpen,
  minimizeAll,
  closeAll,
  toast,
  type SearchHit,
} from "@/features/appshell";

import { matches, type Command } from "../lib";
import { ResultList } from "./spotlight-results";

// The panel MOUNTS per open (and unmounts on close), so query/selection state
// starts fresh every time without effect-driven resets (set-state-in-effect).
export function Spotlight() {
  const open = useSpotlightOpen();
  return open ? <SpotlightPanel /> : null;
}

function SpotlightPanel() {
  const apps = useApps();
  const dynamic = useCommands();
  const search = useShellSearch();
  const { theme, setTheme } = useShellAppearance();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const LISTBOX_ID = "spotlight-listbox";

  // Debounced folder search under ~/projects (live) — opens Files at the hit.
  // Results are state, but "no query → no hits" is derived below (stale hits
  // stay visible during the debounce, matching the old behaviour).
  const [found, setFound] = useState<{ key: string; hits: SearchHit[] } | null>(null);
  const folderHits = useMemo(() => (q.trim() ? (found?.hits ?? []) : []), [q, found]);
  useEffect(() => {
    const query = q.trim();
    if (!query) return;
    let alive = true;
    const t = setTimeout(() => {
      search(query)
        .then((h) => alive && setFound({ key: query, hits: h }))
        .catch(() => alive && setFound({ key: query, hits: [] }));
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
    // Registry-contributed commands (apps/features/shells register at runtime).
    const registered: Command[] = dynamic.map((c) => ({
      id: c.id,
      label: c.label,
      hint: c.hint ?? "Action",
      keywords: c.keywords,
      run: c.run,
    }));
    return [...appCmds, ...actions, ...registered];
  }, [apps, theme, setTheme, dynamic]);

  const results = useMemo(() => {
    const base = commands.filter((c) => matches(q, c.keywords ? `${c.label} ${c.keywords}` : c.label));
    const folderCmds: Command[] = folderHits.map((h) => ({
      id: h.id,
      label: h.label,
      hint: h.hint ?? "Folder",
      run: h.run,
    }));
    return [...base, ...folderCmds];
  }, [commands, q, folderHits]);

  // Focus after the open transition paints (mount = open).
  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  // Clamp the selection in render when results shrink — no clamp effect.
  const selIdx = Math.min(sel, Math.max(0, results.length - 1));

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
      runAt(selIdx);
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
          role="combobox"
          aria-label="Spotlight search"
          aria-expanded={results.length > 0}
          aria-controls={LISTBOX_ID}
          aria-activedescendant={results.length > 0 ? `spotlight-option-${selIdx}` : undefined}
          aria-autocomplete="list"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="Search apps, folders, actions…"
          className="w-full bg-transparent px-5 py-4 text-base outline-none placeholder:text-muted-foreground"
        />
        {results.length > 0 && (
          <ResultList id={LISTBOX_ID} results={results} selIdx={selIdx} onHover={setSel} onPick={runAt} />
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

