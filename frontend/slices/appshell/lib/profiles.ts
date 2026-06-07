"use client";

import { useSyncExternalStore } from "react";
import type { PersistedWindow } from "./types";
import { hydrate, serialize } from "./store";
import { setShell, type ShellPrefs } from "../registry/shells";
import { registerCommands } from "./commands";
import { toast } from "./toast";

// Session profiles — a named layout PLUS the per-surface shell choice
// ("work" = Windows shell + tiled editors; "play" = macOS + media). Applying
// one restores both. Persisted to sv:profiles; palette-driven like layouts.

export type SessionProfile = { windows: PersistedWindow[]; shell: ShellPrefs };

const KEY = "sv:profiles";

function load(): Record<string, SessionProfile> {
  if (typeof localStorage === "undefined") return {};
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, SessionProfile>) ?? {};
  } catch {
    return {};
  }
}

let profiles = load();
let names = Object.keys(profiles);
const subs = new Set<() => void>();

function commit(next: Record<string, SessionProfile>) {
  profiles = next;
  names = Object.keys(next);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  subs.forEach((f) => f());
  syncProfileCommands();
}

function currentShellPrefs(): ShellPrefs {
  try {
    const raw = localStorage.getItem("sv:shell");
    if (raw) return JSON.parse(raw) as ShellPrefs;
  } catch {
    /* fall through */
  }
  return { desktop: "macos", mobile: "ios" };
}

export function saveProfile(name?: string): string {
  let n = name?.trim() ?? "";
  if (!n) {
    let i = 1;
    while (`Profile ${i}` in profiles) i++;
    n = `Profile ${i}`;
  }
  commit({ ...profiles, [n]: { windows: serialize(), shell: currentShellPrefs() } });
  toast(`Profile "${n}" saved`);
  return n;
}

export function applyProfile(name: string): boolean {
  const p = profiles[name];
  if (!p) return false;
  hydrate(p.windows);
  setShell("desktop", p.shell.desktop);
  setShell("mobile", p.shell.mobile);
  toast(`Profile "${name}" applied`);
  return true;
}

export function deleteProfile(name: string): void {
  if (!(name in profiles)) return;
  const { [name]: _gone, ...rest } = profiles;
  commit(rest);
  toast(`Profile "${name}" deleted`);
}

export function listProfiles(): string[] {
  return names;
}

export function useProfiles(): string[] {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    () => names,
    () => names,
  );
}

function syncProfileCommands() {
  registerCommands("profiles", [
    {
      id: "profile:save",
      label: "Save session profile",
      hint: "Profile",
      keywords: "workspace session shell layout snapshot",
      run: () => saveProfile(),
    },
    ...names.flatMap((n) => [
      {
        id: `profile:apply:${n}`,
        label: `Apply profile: ${n}`,
        hint: "Profile",
        keywords: "session workspace switch",
        run: () => applyProfile(n),
      },
      {
        id: `profile:delete:${n}`,
        label: `Delete profile: ${n}`,
        hint: "Profile",
        run: () => deleteProfile(n),
      },
    ]),
  ]);
}
syncProfileCommands();
