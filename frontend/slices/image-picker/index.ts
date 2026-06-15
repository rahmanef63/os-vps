/** image-picker — generic image / wallpaper chooser. The headline API is ONE
 *  button (ImagePickerButton) that opens a dialog: Gallery (colours / gradients
 *  / textures) · Upload (inject your storage via `onUpload`) · Link (paste a
 *  URL) · Stock (curated set + keyless live search via /api/v1/stock/search —
 *  Openverse by default, Unsplash when the server holds a key). ImageBanner is
 *  the optional reposition-able band (page cover / profile header / hero). */

export { ImagePickerButton } from "./components/image-picker-button";
export { ImagePickerDialog } from "./components/image-picker-dialog";
export { ImageBanner } from "./components/image-banner";

export { parseImage, isCssImage, isUrlImage, imageRef } from "./lib/parseImage";
export { imageStyle } from "./lib/imageStyle";
export { GALLERY_SECTIONS } from "./lib/galleryPresets";
export { CURATED_UNSPLASH } from "./lib/unsplashCurated";

export type {
  ImageValue, ImageField, ImageSource,
  UnsplashPhoto,
  UploadFn, ImageSourceProps,
} from "./types";
