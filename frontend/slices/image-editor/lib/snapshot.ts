// Snapshot a canvas as a blob: URL backed by a real Blob (NOT a base64 data
// URL). Blobs share memory pages with the browser's allocator, so a 60-step
// undo stack of full-canvas snapshots costs ~one canvas worth of RAM instead
// of one duplicated data URL per step. The history layer revokes the URL when
// the action falls off the stack — failing to revoke would leak the Blob.
export function snapshotCanvas(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob !== "function") {
      // Fallback for older runtimes (jsdom etc): keep the data-URL contract.
      resolve(canvas.toDataURL());
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(canvas.toDataURL());
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, "image/png");
  });
}
