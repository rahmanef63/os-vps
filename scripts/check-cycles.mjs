#!/usr/bin/env node
// Detect import cycles under frontend/ + lib/. Distinguishes VALUE cycles
// (runtime risk) from BARREL/TYPE cycles (benign — pure re-exports are hoisted
// by ESM, type-only imports erased at compile). Exits 1 only on VALUE cycles.
import { readFileSync, statSync, readdirSync } from "node:fs";
import { dirname, join, resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = pathResolve(fileURLToPath(import.meta.url), "../..");
const SCAN = ["frontend", "lib"].map((d) => join(ROOT, d));
const EXTS = [".ts", ".tsx"];
const IMP_RE =
  /(?:^|[\s;])(?:(import\s+type\s+[^"']*?from\s+["']([^"']+)["'])|(export\s+type\s+[^"']*?from\s+["']([^"']+)["'])|(export\s*\*\s*from\s+["']([^"']+)["'])|(export\s*\{[^}]*\}\s*from\s+["']([^"']+)["'])|(import\s+[^"']*?from\s+["']([^"']+)["']))/g;

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
// Pure barrel: only re-exports / type-imports / bare side-effect imports.
// No value-binding imports, no executable statements. ESM hoists every
// re-export binding before any body runs → cycles through such files are safe.
function isPureBarrel(src) {
  const s = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\n)\s*\/\/[^\n]*/g, "");
  if (/(^|\n)\s*import\s+(?!type\b)(?![\s]*["'])/.test(s)) return false;
  return !/(^|\n)\s*(?:const|let|var|function|class|if|for|while|switch|return|throw|await|async\s+function)\b/.test(s);
}

const files = SCAN.flatMap((d) => walk(d));
const graph = new Map(), barrel = new Map();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  barrel.set(f, isPureBarrel(src));
  const edges = new Map();
  for (const m of src.matchAll(IMP_RE)) {
    const spec = m[2] ?? m[4] ?? m[6] ?? m[8] ?? m[10];
    if (!spec) continue;
    const t = resolveImp(f, spec);
    if (!t || t === f) continue;
    const kind = m[1] || m[3] || m[5] || m[7] ? "type" : "value";
    if (edges.get(t) !== "value") edges.set(t, kind);
  }
  graph.set(f, edges);
}

const WHITE = 0, GRAY = 1, BLACK = 2;
const color = new Map(), stack = [], cycles = [];
function dfs(n) {
  color.set(n, GRAY); stack.push(n);
  for (const [nx] of graph.get(n) ?? []) {
    const c = color.get(nx) ?? WHITE;
    if (c === GRAY) {
      const i = stack.indexOf(nx);
      if (i < 0) continue;
      const ring = stack.slice(i).concat(nx);
      // Benign iff any edge is type-only (TS erases it, breaking runtime cycle)
      // OR the back-edge target is a pure barrel (only live hoisted bindings).
      let anyType = false;
      for (let k = i; k < stack.length; k++)
        if (graph.get(stack[k])?.get(stack[k + 1] ?? nx) === "type") anyType = true;
      cycles.push({ ring, kind: anyType || barrel.get(nx) ? "type" : "value" });
    } else if (c === WHITE) dfs(nx);
  }
  stack.pop(); color.set(n, BLACK);
}
for (const f of graph.keys()) if ((color.get(f) ?? WHITE) === WHITE) dfs(f);

const value = cycles.filter((c) => c.kind === "value");
const type = cycles.filter((c) => c.kind === "type");
const rel = (f) => f.replace(ROOT + "/", "");
console.log(`check-cycles: ${graph.size} files scanned — value cycles: ${value.length}, barrel/type cycles: ${type.length}`);
for (const c of value) console.log("\n  [VALUE] " + c.ring.map(rel).join("\n  → "));
if (process.argv.includes("--verbose"))
  for (const c of type) console.log("\n  [barrel/type] " + c.ring.map(rel).join("\n  → "));
process.exit(value.length === 0 ? 0 : 1);
