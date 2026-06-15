"use client";

import { GALLERY_SECTIONS } from "../../lib/galleryPresets";
import { imageStyle } from "../../lib/imageStyle";
import type { ImageValue } from "../../types";

export function GalleryTab({ onSelect }: { onSelect: (c: ImageValue) => void }) {
  return (
    <div className="space-y-4 p-4">
      {GALLERY_SECTIONS.map((sec) => (
        <div key={sec.label}>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {sec.label}
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {sec.items.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(item)}
                style={imageStyle(item)}
                aria-label={`${sec.label} ${i + 1}`}
                className="h-12 rounded-md ring-1 ring-border transition hover:ring-2 hover:ring-primary"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
