import type Konva from "konva";

export type ExportFormat = "png" | "jpeg" | "webp";

const MIME: Record<ExportFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

// Render the stage to a data URL. `pixelRatio` scales output (2 = retina/2×).
// JPEG/WebP take quality 0..1; PNG ignores it.
export function stageToDataURL(
  stage: Konva.Stage,
  opts: { format?: ExportFormat; quality?: number; pixelRatio?: number } = {},
): string {
  const { format = "png", quality = 0.92, pixelRatio = 1 } = opts;
  return stage.toDataURL({ mimeType: MIME[format], quality, pixelRatio });
}

export function downloadDataURL(dataURL: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function exportStage(
  stage: Konva.Stage,
  opts: { format?: ExportFormat; quality?: number; pixelRatio?: number; name?: string } = {},
) {
  const format = opts.format ?? "png";
  const url = stageToDataURL(stage, opts);
  downloadDataURL(url, `${opts.name ?? "export"}.${format === "jpeg" ? "jpg" : format}`);
}
