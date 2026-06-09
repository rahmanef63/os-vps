/** Build the CSS for an image value. URL-backed images apply a vertical focal
 *  point via background-position; colour/gradient values go straight into
 *  `background`. `resolvedUrl` is the host-resolved URL for upload (FileRef)
 *  values. */

import type { CSSProperties } from "react";
import type { ImageValue } from "../types";
import { isUrlImage } from "./parseImage";

export function imageStyle(img: ImageValue, resolvedUrl?: string | null): CSSProperties {
  const posY = img.positionY ?? 50;
  if (isUrlImage(img)) {
    const url = resolvedUrl ?? img.value;
    // Escape the CSS string: backslash/quote get backslash-escaped and newlines
    // stripped so a crafted value can't break out of the url("…") literal.
    const safeUrl = url.replace(/[\\"]/g, "\\$&").replace(/[\r\n]/g, "");
    return {
      backgroundImage: `url("${safeUrl}")`,
      backgroundSize: "cover",
      backgroundPosition: `center ${posY}%`,
      backgroundRepeat: "no-repeat",
    };
  }
  return { background: img.value };
}
