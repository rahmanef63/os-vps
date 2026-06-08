/** image-picker — generic image / wallpaper chooser types. The headline API is
 *  ONE button that opens a dialog (Gallery · Upload · Link · Unsplash). Values
 *  carry an optional vertical focal point so the same value can also drive a
 *  reposition-able banner. Portable: the upload backend + Unsplash search are
 *  INJECTED as props (the slice imports no other slice + no backend), so it
 *  drops into any app — page cover, profile header, card hero, wallpaper, … */

export type ImageSource = "color" | "gradient" | "texture" | "upload" | "link" | "unsplash";

export interface ImageValue {
  type: ImageSource;
  /** color/gradient → CSS value; texture/upload/link/unsplash → URL or FileRef. */
  value: string;
  /** Vertical focal point 0–100 (default 50) — used when rendered as a banner. */
  positionY?: number;
  /** Per-type metadata. unsplash: { photographer, source, thumb, … }. */
  metadata?: Record<string, unknown>;
}

/** A stored image field — legacy raw string, an ImageValue object, or empty. */
export type ImageField = string | ImageValue | null | undefined;

export interface UnsplashPhoto {
  id: string;
  regular: string;
  thumb: string;
  full: string;
  width: number;
  height: number;
  alt: string;
  photographer: string;
  photographerUrl: string;
  /** Click-through page (required by the Unsplash License). */
  source: string;
}

export interface UnsplashSearchResult {
  photos: UnsplashPhoto[];
  total?: number;
  error?: string;
}

/** Inject the upload backend (e.g. wire to the `files` slice). Returns the
 *  stored ref/URL to keep in the image value. */
export type UploadFn = (file: File) => Promise<string>;

/** Inject the Unsplash searcher (e.g. a server route / Convex action). When
 *  omitted, the Unsplash tab browses the bundled curated set only. */
export type UnsplashSearchFn = (query: string, perPage?: number) => Promise<UnsplashSearchResult>;

/** Shared props threaded from the picker down to the tabs. */
export interface ImageSourceProps {
  onUpload?: UploadFn;
  searchUnsplash?: UnsplashSearchFn;
}
