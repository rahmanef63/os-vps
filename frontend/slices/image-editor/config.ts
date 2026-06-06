// Slice config (rr: frontend.configExport = "imageEditorConfig"). Cosmetic
// defaults only — the editor takes its real input via <ImageEditor> props.
export type ImageEditorConfig = {
  /** Default blank-canvas size when no initialImage is given. */
  defaultWidth: number;
  defaultHeight: number;
  /** Default export format. */
  exportFormat: "png" | "jpeg" | "webp";
};

export const imageEditorConfig: ImageEditorConfig = {
  defaultWidth: 1080,
  defaultHeight: 1080,
  exportFormat: "png",
};

export default imageEditorConfig;
