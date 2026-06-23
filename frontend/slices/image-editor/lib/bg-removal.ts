// One-click background removal — free, in-browser, no API key, no server.
// Backed by @imgly/background-removal (downloads a small ONNX model to the
// browser cache on first run, then runs locally via WASM). Lazy-imported so the
// model + WASM only load when the user actually clicks "Remove background".

export type BgProgress = (stage: string, done: number, total: number) => void;

/** Remove the background from an image (data URL / object URL / remote URL) and
 *  return a PNG data URL with a transparent background. */
export async function removeImageBackground(
  src: string,
  onProgress?: BgProgress,
): Promise<string> {
  const { removeBackground } = await import("@imgly/background-removal");
  const blob = await removeBackground(src, {
    output: { format: "image/png" },
    progress: onProgress,
  });
  return blobToDataURL(blob);
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
