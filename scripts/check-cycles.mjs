#!/usr/bin/env node
// Detect import cycles under frontend/ + lib/. Regex-based reader (no parser),
// resolves relative + the "@/..." and "@/features/*" aliases from tsconfig.
// Exits 1 on cycles so CI can wire it later. ≤80 LOC.
import { readFileSync, statSync, readdirSync } from "node:fs";
import { dirname, join, resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = pathResolve(fileURLToPath(import.meta.url), "../..");
const SCAN = ["frontend", "lib"].map((d) => join(ROOT, d));
const EXTS = [".ts", ".tsx"];
const RE = /(?:from|import)\s+["']([^"']+)["']/g;

function walk(d, out = []) {
  let es; try { es = readdirSync(d, { withFileTypes: true }); } catch { return out; }
  for (const e of es) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXTS.some((x) => p.endsWith(x))) out.push(p);
  }
  return out;
}
const isFile = (p) => statSync(p, { throwIfNoEntry: false })?.isFile();
function tryRes(s) {
  if (isFile(s)) return s;
  for (const x of EXTS) if (isFile(s + x)) return s + x;
  for (const x of EXTS) if (isFile(join(s, "index" + x))) return join(s, "index" + x);
  return null;
}
function resolveImp(from, s) {
  if (s.startsWith("@/features/")) return tryRes(join(ROOT, "frontend/slices", s.slice(11)));
  if (s.startsWith("@/")) return tryRes(join(ROOT, s.slice(2)));
  if (s.startsWith(".")) return tryRes(pathResolve(dirname(from), s));
  return null;
}

const files = SCAN.flatMap((d) => walk(d));
const graph = new Map();
for (const f of files) {
  const deps = new Set();
  for (const m of readFileSync(f, "utf8").matchAll(RE)) {
    const t = resolveImp(f, m[1]);
    if (t && t !== f) deps.add(t);
  }
  graph.set(f, deps);
}

const WHITE = 0, GRAY = 1, BLACK = 2;
const color = new Map(), stack = [], cycles = [];
function dfs(n) {
  color.set(n, GRAY); stack.push(n);
  for (const nx of graph.get(n) ?? []) {
    const c = color.get(nx) ?? WHITE;
    if (c === GRAY) {
      const i = stack.indexOf(nx);
      if (i >= 0) cycles.push(stack.slice(i).concat(nx));
    } else if (c === WHITE) dfs(nx);
  }
  stack.pop(); color.set(n, BLACK);
}
for (const f of graph.keys()) if ((color.get(f) ?? WHITE) === WHITE) dfs(f);

if (cycles.length === 0) {
  console.log("check-cycles: clean (0 cycles across " + graph.size + " files)");
  process.exit(0);
}
console.log("check-cycles: " + cycles.length + " cycle(s) found");
for (const c of cycles) console.log("\n  " + c.map((f) => f.replace(ROOT + "/", "")).join("\n  → "));
process.exit(1);
