#!/usr/bin/env node
// Validate every frontend/slices/*/slice.json against the project's minimal
// contract: `slug` (kebab-case), `version` (semver), and (when present) a
// well-typed `auth` field. Adapted to the on-disk schema (no top-level `id` —
// the kitab uses `slug`; auth/deps live under sub-objects).
//
// Exits 1 on any violation so CI can wire it later.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = pathResolve(fileURLToPath(import.meta.url), "../..");
const SLICES = join(ROOT, "frontend", "slices");
const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;
const ALLOWED_AUTH = new Set(["cookie", "none"]);

function entries(dir) {
  try { return readdirSync(dir, { withFileTypes: true }); } catch { return []; }
}

const violations = [];
let checked = 0;
for (const e of entries(SLICES)) {
  if (!e.isDirectory()) continue;
  const slicePath = join(SLICES, e.name, "slice.json");
  if (!statSync(slicePath, { throwIfNoEntry: false })?.isFile()) continue;
  checked++;
  let json;
  try { json = JSON.parse(readFileSync(slicePath, "utf8")); }
  catch (err) { violations.push(`${e.name}: invalid JSON — ${err.message}`); continue; }

  // slug — required, kebab-case
  if (typeof json.slug !== "string" || !KEBAB.test(json.slug)) {
    violations.push(`${e.name}: missing or non-kebab \`slug\` (got ${JSON.stringify(json.slug)})`);
  }

  // version — required, semver
  if (typeof json.version !== "string" || !SEMVER.test(json.version)) {
    violations.push(`${e.name}: missing or non-semver \`version\` (got ${JSON.stringify(json.version)})`);
  }

  // auth — optional. If present, must be string + one of allowed values.
  if (json.auth !== undefined) {
    if (typeof json.auth !== "string" || !ALLOWED_AUTH.has(json.auth)) {
      violations.push(`${e.name}: \`auth\` must be one of ${[...ALLOWED_AUTH].join("|")} (got ${JSON.stringify(json.auth)})`);
    }
  }

  // dependencies — optional. If present at top-level, must be array of strings.
  // (Real schema nests under `deps.npm` etc.; we only assert when consumers put
  // a flat `dependencies` key per the agent task contract.)
  if (json.dependencies !== undefined) {
    if (!Array.isArray(json.dependencies) || !json.dependencies.every((d) => typeof d === "string")) {
      violations.push(`${e.name}: \`dependencies\` must be an array of strings`);
    }
  }
}

if (violations.length === 0) {
  console.log("check-slices: clean (" + checked + " slice.json validated)");
  process.exit(0);
}
console.log("check-slices: " + violations.length + " violation(s)");
for (const v of violations) console.log("  - " + v);
process.exit(1);
