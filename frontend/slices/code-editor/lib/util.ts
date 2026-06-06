import type { Lang } from "./highlight";

// Path helpers (POSIX-ish, all paths absolute and "/"-rooted).
export function baseName(path: string): string {
  return path.replace(/\/$/, "").split("/").pop() ?? path;
}

export function extOf(path: string): string {
  const b = baseName(path);
  return b.includes(".") ? (b.split(".").pop() ?? "").toLowerCase() : "";
}

export function joinPath(dir: string, name: string): string {
  return dir === "/" ? `/${name}` : `${dir.replace(/\/$/, "")}/${name}`;
}

// Map a file extension to a supported highlight language.
const EXT_LANG: Record<string, Lang> = {
  ts: "ts",
  tsx: "ts",
  mts: "ts",
  js: "js",
  jsx: "js",
  mjs: "js",
  cjs: "js",
  py: "py",
  sh: "sh",
  bash: "sh",
  zsh: "sh",
  json: "json",
  css: "css",
  scss: "css",
  md: "md",
  markdown: "md",
};

export function langOf(path: string): Lang {
  return EXT_LANG[extOf(path)] ?? "txt";
}

// Compute 1-based line/column from a caret offset into `text`.
export function lineCol(text: string, caret: number): { ln: number; col: number } {
  const upto = text.slice(0, caret);
  const lines = upto.split("\n");
  return { ln: lines.length, col: lines[lines.length - 1].length + 1 };
}
