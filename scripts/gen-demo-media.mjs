#!/usr/bin/env node
// Scan public/demo-media/ and write manifest.json (consumed by the mock adapter
// to list the "Demo Media" folder in the demo). Run after adding/removing files:
//   node scripts/gen-demo-media.mjs
import { readdirSync, writeFileSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "demo-media");
const SKIP = new Set(["manifest.json", "README.md", ".gitkeep", ".DS_Store"]);

const files = readdirSync(DIR)
  .filter((n) => !SKIP.has(n) && !n.startsWith("."))
  .filter((n) => statSync(path.join(DIR, n)).isFile())
  .sort();

const manifest = files.map((name) => ({ name, size: statSync(path.join(DIR, name)).size }));
writeFileSync(path.join(DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`demo-media manifest: ${manifest.length} file(s) →`, files.join(", ") || "(none)");
