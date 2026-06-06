// In-memory filesystem model for the os-terminal shell. Path → entries map,
// plus the cwd-relative path helpers. Kept separate so commands.ts stays small.
import type { FsEntry } from "./host";

export type LineKind = "sys" | "cmd" | "out" | "err" | "fetch";
export type Line = { t: LineKind; v: string; cwd?: string };

export type FsModel = Record<string, FsEntry[]>;

// Seeds a plausible VPS layout — the mock fallback and the canonical model for
// mkdir/touch/rm/mv/cp when live data is unavailable.
export function seedFs(): FsModel {
  return {
    "/": [
      { name: "Media", kind: "dir", size: 0 },
      { name: "Projects", kind: "dir", size: 0 },
      { name: "Downloads", kind: "dir", size: 0 },
      { name: "Documents", kind: "dir", size: 0 },
      { name: "apps", kind: "dir", size: 0 },
      { name: "readme.md", kind: "file", size: 1840, ext: "md" },
    ],
    "/Projects": [{ name: "os-vps", kind: "dir", size: 0 }],
    "/Documents": [{ name: "notes.txt", kind: "file", size: 96, ext: "txt" }],
    "/apps": [],
    "/Media": [],
    "/Downloads": [],
  };
}

export const base = (cwd: string) => (cwd === "/" ? "/" : cwd + "/");

export function resolve(cwd: string, arg?: string): string {
  if (!arg || arg === ".") return cwd;
  if (arg === "/") return "/";
  if (arg === "..") {
    const p = cwd.split("/").filter(Boolean);
    p.pop();
    return "/" + p.join("/");
  }
  const raw = arg.startsWith("/") ? arg : base(cwd) + arg;
  return raw === "/" ? "/" : raw.replace(/\/+$/, "");
}

export function extTag(name: string): string | undefined {
  const e = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  return e || undefined;
}

// Re-path a directory subtree after mv (moves all descendant keys).
export function rekey(fs: FsModel, oldP: string, newP: string) {
  if (oldP === newP) return;
  for (const k of Object.keys(fs)) {
    if (k === oldP || k.startsWith(oldP + "/")) {
      fs[newP + k.slice(oldP.length)] = fs[k];
      delete fs[k];
    }
  }
}

export const NEOFETCH = {
  logo: "  ___  ___ \n / _ \\/ __|\n| (_) \\__ \\\n \\___/|___/\n topside",
  rows: [
    ["os", "topside 1.0.0 web-cockpit"],
    ["shell", "vps-sh 1.0"],
    ["cpu", "8 vCPU @ 3.1GHz"],
    ["memory", "6.4G / 16G"],
    ["disk", "289G / 460G"],
    ["uptime", "14d 6h"],
  ] as [string, string][],
};
