import { exportStage, type ExportFormat } from "../lib/export";
import { removeImageBackground } from "../lib/bg-removal";
import type { EditorCommand } from "./types";
import { num, obj, resolveLayer, str, targetProps } from "./schema";

// Output + AI-heavy image ops: export to file, and free in-browser bg removal.
export const exportCommands: EditorCommand[] = [
  {
    name: "export.image",
    description: "Render the canvas and download it as an image file.",
    parameters: obj({
      format: str("png | jpeg | webp", { enum: ["png", "jpeg", "webp"] }),
      scale: num("Pixel ratio (1, 2, 3)", { min: 1, max: 4 }),
      name: str("File name without extension"),
    }),
    run: (ctx, a) => {
      const stage = ctx.stageRef.current;
      if (!stage) throw new Error("canvas not ready");
      const format = (a.format as ExportFormat) ?? "png";
      exportStage(stage, { format, pixelRatio: a.scale ? Number(a.scale) : 1, name: a.name ? String(a.name) : "export" });
      return `exported ${format} (${a.scale ?? 1}x)`;
    },
  },
  {
    name: "image.removeBackground",
    description:
      "Remove the background of an IMAGE layer (free, in-browser). Replaces the layer's pixels with a transparent-background cutout. May take a few seconds on first run.",
    parameters: obj({ ...targetProps }),
    run: async (ctx, a) => {
      const l = resolveLayer(ctx, a);
      if (l.kind !== "image" || !l.src) throw new Error(`"${l.name}" is not an image layer`);
      const cutout = await removeImageBackground(l.src);
      ctx.update(l.id, { src: cutout });
      return `removed background of "${l.name}"`;
    },
  },
];
