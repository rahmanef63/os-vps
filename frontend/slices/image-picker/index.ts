/** image-picker — generic image / wallpaper chooser. The headline API is ONE
 *  button (ImagePickerButton) that opens a dialog: Gallery (colours / gradients
 *  / textures) · Upload (inject your storage via `onUpload`) · Link (paste a
 *  URL) · Unsplash (curated set + live search via injected `searchUnsplash`).
 *  ImageBanner is the optional reposition-able band (page cover / profile
 *  header / hero). Imports no other slice + no backend — wire the upload +
 *  Unsplash adapters at the app level (e.g. the `files` slice + a server
 *  route). */

export { ImagePickerButton } from "./components/ImagePickerButton";
export { ImagePickerDialog } from "./components/ImagePickerDialog";
export { ImageBanner } from "./components/ImageBanner";

export { parseImage, isCssImage, isUrlImage, imageRef } from "./lib/parseImage";
export { imageStyle } from "./lib/imageStyle";
export { GALLERY_SECTIONS } from "./lib/galleryPresets";
export { CURATED_UNSPLASH } from "./lib/unsplashCurated";
export { unsplashSearchVia } from "./lib/unsplashSearch";

export type {
  ImageValue, ImageField, ImageSource,
  UnsplashPhoto, UnsplashSearchResult,
  UploadFn, UnsplashSearchFn, ImageSourceProps,
} from "./types";
