/**
 * image-picker — portable one-button image / wallpaper chooser.
 *
 * Pure / props-driven · imports no sibling slice + no backend. The upload
 * backend (onUpload) and Unsplash search (searchUnsplash) are injected by the
 * host (wire to the `files` slice + a server route holding UNSPLASH_ACCESS_KEY).
 */

import { defineSliceContract } from "@/packages/cli/lib/contract";

export const contract = defineSliceContract({
  id: "image-picker",
  version: "0.1.0",
  category: "ui",
  kind: "ui",
  provides: {
    components: ["ImagePickerButton", "ImagePickerDialog", "ImageBanner"],
    utils: ["parseImage", "isCssImage", "isUrlImage", "imageRef", "imageStyle", "GALLERY_SECTIONS", "CURATED_UNSPLASH", "unsplashSearchVia"],
    hooks: [],
    types: ["ImageValue", "ImageField", "ImageSource", "UnsplashPhoto", "UnsplashSearchResult", "UploadFn", "UnsplashSearchFn", "ImageSourceProps"],
  },
  requires: {
    npm: [],
    shadcn: ["dialog", "button", "input"],
    env: ["UNSPLASH_ACCESS_KEY"],
    peers: [],
    routes: [],
    tables: [],
  },
});
