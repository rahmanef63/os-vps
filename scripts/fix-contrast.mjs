#!/usr/bin/env node
// One-shot WCAG-AA tuner for the tweakcn presets (lib/appearance/presets/registry-data.json).
// Identity-preserving: keeps each colour's HUE + CHROMA and the author's existing
// foreground choice (no white<->black text flips); moves ONLY the failing token's
// oklch LIGHTNESS by the minimum needed to reach 4.5:1. Mirrors the convention
// globals.css already uses for its default accent ("nudge darker, minimal delta").
//   - muted-foreground vs background -> adjust muted-foreground (text legibility)
//   - primary-foreground   vs primary     -> adjust primary     (control bg)
//   - destructive-foreground vs destructive -> adjust destructive (control bg)
// Only oklch tokens are tuned (all preset tokens are oklch). Uses the SAME
// oklch->linear math as scripts/check-contrast.mjs so the re-audit agrees.
// ponytail: run once, commit the data; not wired into the build.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = pathResolve(fileURLToPath(import.meta.url), "../..");
const FILE = join(ROOT, "lib/appearance/presets/registry-data.json");
const TARGET = 4.53; // small margin over 4.5 so 2dp rounding + oklch approx still clears

// pair: [foregroundKey, backgroundKey, whichKeyToAdjust]
const PAIRS = [
  ["muted-foreground", "background", "muted-foreground"],
  ["primary-foreground", "primary", "primary"],
  ["destructive-foreground", "destructive", "destructive"],
];

const srgbToLin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
function oklchToLin(L, C, h) {
  h = (h * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const lc = l_ ** 3, mc = m_ ** 3, sc = s_ ** 3;
  return [
    4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
    -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
    -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
  ].map((v) => Math.max(0, Math.min(1, v)));
}
const OKLCH = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.-]+)\s*\)$/i;
function parseHex(s) {
  const m = s.match(/^#([0-9a-f]{3,8})$/i); if (!m) return null;
  let h = m[1]; if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [srgbToLin(parseInt(h.slice(0, 2), 16)), srgbToLin(parseInt(h.slice(2, 4), 16)), srgbToLin(parseInt(h.slice(4, 6), 16))];
}
function parseRgb(s) {
  const m = s.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  return m ? [srgbToLin(+m[1]), srgbToLin(+m[2]), srgbToLin(+m[3])] : null;
}
function toLin(raw) {
  if (!raw) return null;
  const s = raw.trim();
  const m = s.match(OKLCH);
  if (m) return oklchToLin(+m[1], +m[2], +m[3]);
  return parseHex(s) ?? parseRgb(s);
}
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const ratio = (a, b) => { const [L1, L2] = [lum(a), lum(b)].sort((x, y) => y - x); return (L1 + 0.05) / (L2 + 0.05); };

// Find the minimum-delta lightness for `oklch` (keeping C,h) so its contrast vs
// `fixed` reaches TARGET. Scan outward from the current L (away from `fixed`'s
// luminance) — the first crossing is the smallest visual change.
function retuneL(L0, C, h, fixed) {
  const fixLum = lum(fixed);
  const curLum = lum(oklchToLin(L0, C, h));
  const dir = curLum >= fixLum ? +1 : -1; // push further from the fixed colour
  for (let L = L0; L >= 0 && L <= 1; L = +(L + dir * 0.005).toFixed(4)) {
    if (ratio(oklchToLin(L, C, h), fixed) >= TARGET) {
      // round to 2dp in the SAFE direction (more contrast), then re-verify
      let Lr = dir > 0 ? Math.ceil(L * 100) / 100 : Math.floor(L * 100) / 100;
      Lr = Math.max(0, Math.min(1, Lr));
      if (ratio(oklchToLin(Lr, C, h), fixed) < 4.5) Lr = +(Lr + dir * 0.01).toFixed(2);
      return Math.max(0, Math.min(1, Lr));
    }
  }
  return null; // unreachable for white/black-anchored pairs
}

const j = JSON.parse(readFileSync(FILE, "utf8"));
const log = [];
let fixed = 0;
for (const item of j.items) {
  for (const mode of ["light", "dark"]) {
    const v = item.cssVars?.[mode]; if (!v) continue;
    for (const [fgK, bgK, adjK] of PAIRS) {
      const fgLin = toLin(v[fgK]), bgLin = toLin(v[bgK]);
      if (!fgLin || !bgLin) continue;
      if (ratio(fgLin, bgLin) >= 4.5) continue;
      const adjRaw = v[adjK];
      const m = adjRaw?.match(OKLCH);
      if (!m) { log.push(`SKIP non-oklch ${item.name}/${mode}/${adjK}=${adjRaw}`); continue; }
      const [, Ls, Cs, hs] = m;
      const other = adjK === fgK ? bgLin : fgLin; // hold the non-adjusted side fixed
      const newL = retuneL(+Ls, +Cs, +hs, other);
      if (newL == null) { log.push(`FAIL unreachable ${item.name}/${mode}/${adjK}`); continue; }
      const newVal = `oklch(${newL.toFixed(2)} ${Cs} ${hs})`;
      if (newVal === adjRaw) continue;
      // Sync same-valued brand keys (ring, sidebar-primary, ...) ONLY for saturated
      // control colours (chroma>0.02) — never propagate a near-neutral/white token.
      if (adjK !== "muted-foreground" && +Cs > 0.02) {
        for (const k of Object.keys(v)) if (v[k] === adjRaw) v[k] = newVal;
      } else {
        v[adjK] = newVal;
      }
      log.push(`${item.name.padEnd(18)} ${mode.padEnd(5)} ${adjK.padEnd(12)} L ${Ls} -> ${newL.toFixed(2)}`);
      fixed++;
    }
  }
}
writeFileSync(FILE, JSON.stringify(j, null, 2) + "\n");
console.log(log.join("\n"));
console.log(`\nRetuned ${fixed} token(s) across the preset library.`);
