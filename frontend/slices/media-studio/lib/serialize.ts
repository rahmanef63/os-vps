// Import/export helpers: round-trip the os-rr/layers@1 JSON doc, build a
// standalone HTML export, and parse a dropped/loaded JSON or HTML file.
import { ADJ_DEFAULT, type Adjustments } from "./filters";
import {
  createLayer,
  mkId,
  type Layer,
  type LayerDoc,
  type LayerKind,
} from "./model";

function esc(s: unknown): string {
  return String(s == null ? "" : s).replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c,
  );
}

// Inner markup for one layer in the standalone HTML export.
function layerInnerHTML(l: Layer): string {
  const clip = l.clip ? `;clip-path:${l.clip}` : "";
  if (l.kind === "text")
    return `<div style="color:${l.color};font:800 34px/1 system-ui,sans-serif;letter-spacing:-.02em;text-shadow:0 2px 14px rgba(0,0,0,.35);text-align:center${clip}">${esc(l.text)}</div>`;
  if (l.kind === "sticker")
    return `<div style="font-size:54px;line-height:1;filter:drop-shadow(0 3px 8px rgba(0,0,0,.4))${clip}">${esc(l.emoji)}</div>`;
  if (l.kind === "shape")
    return `<div style="width:46%;height:46%;border-radius:${l.shape === "ellipse" ? "50%" : "18px"};background:${l.color}${clip}"></div>`;
  if (l.kind === "html") return l.html || "";
  if (l.kind === "image" && l.src)
    return `<img src="${esc(l.src)}" style="width:${l.base ? "100%" : "62%"};height:${l.base ? "100%" : "62%"};object-fit:cover;border-radius:${l.base ? "0" : "8px"}${clip}" alt="">`;
  return `<div style="width:${l.base ? "100%" : "62%"};height:${l.base ? "100%" : "62%"};border-radius:${l.base ? "0" : "8px"};background:${l.tint || "#666"}${clip}"></div>`;
}

/** Build a self-contained HTML document for the layer stack (auto z-index). */
export function buildHTML(layers: Layer[], aspect: string): string {
  const n = layers.length;
  const body = layers
    .map((l, i) => {
      if (!l.visible) return "";
      const css = l.css ? ";" + l.css : "";
      return `  <div class="os-layer" style="z-index:${n - i};opacity:${l.opacity / 100};transform:translate(${l.x}%,${l.y}%) scale(${l.scale / 100}) rotate(${l.rotate}deg)${css}">\n    ${layerInnerHTML(l)}\n  </div>`;
    })
    .filter(Boolean)
    .join("\n");
  return `<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>os-rr export</title>\n<style>\n  body{margin:0;background:#15161a}\n  .os-stage{position:relative;aspect-ratio:${aspect};max-width:480px;margin:24px auto;overflow:hidden;background:#0b0b0e;border-radius:10px}\n  .os-layer{position:absolute;inset:0;display:grid;place-items:center}\n</style>\n</head>\n<body>\n<div class="os-stage">\n${body}\n</div>\n</body>\n</html>`;
}

type ImportResult = {
  layers: Layer[];
  aspect?: string;
  adjustments?: Adjustments;
};

// Map one doc layer into the in-memory shape (assigns fresh local ids).
function fromDocLayer(l: Record<string, unknown>): Layer {
  const t = (l.transform ?? {}) as Record<string, number>;
  return createLayer((l.kind as LayerKind) || "shape", {
    id: mkId(),
    name: (l.name as string) || "Layer",
    visible: l.visible !== false,
    opacity: l.opacity == null ? 100 : (l.opacity as number),
    x: t.x || 0,
    y: t.y || 0,
    scale: t.scale ?? 100,
    rotate: t.rotate || 0,
    text: l.text as string | undefined,
    color: l.color as string | undefined,
    shape: l.shape as "rect" | "ellipse" | undefined,
    emoji: l.emoji as string | undefined,
    tint: l.tint as string | undefined,
    src: l.src as string | undefined,
    html: l.html as string | undefined,
    clip: l.clip as string | undefined,
    css: l.css as string | undefined,
  });
}

/** Parse an os-rr/layers@1 doc; front layer = highest z. Returns null if bad. */
export function parseDoc(text: string): ImportResult | null {
  let doc: LayerDoc;
  try {
    doc = JSON.parse(text);
  } catch {
    return null;
  }
  if (!doc || !Array.isArray(doc.layers)) return null;
  const layers = [...doc.layers]
    .sort((a, b) => (b.z || 0) - (a.z || 0))
    .map((l) => fromDocLayer(l as Record<string, unknown>));
  return {
    layers,
    aspect: doc.canvas?.aspect,
    adjustments: doc.adjustments
      ? { ...ADJ_DEFAULT, ...doc.adjustments }
      : undefined,
  };
}

/** Read a File (.json doc or .html/.txt → embed layer) → import result. */
export function importFile(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const txt = String(r.result);
      if (/\.json$/i.test(file.name)) {
        const res = parseDoc(txt);
        if (res) resolve(res);
        else reject(new Error("Invalid JSON layer document"));
      } else {
        resolve({
          layers: [createLayer("html", { name: file.name, html: txt })],
        });
      }
    };
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsText(file);
  });
}
