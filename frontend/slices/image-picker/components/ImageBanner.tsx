"use client";

/** ImageBanner — render an ImageValue as a full-width band (colour / gradient /
 *  texture / uploaded / linked / unsplash image) with hover controls: Change
 *  (opens the picker dialog) · Reposition (drag the vertical focal point) ·
 *  Remove. Optional — use it for a page cover, profile header, or card hero;
 *  for a plain set-an-image control use ImagePickerButton instead. `resolvedUrl`
 *  is the host-resolved URL for upload (FileRef) values — for every other type
 *  the value IS the URL. Pure / props-driven. */

import * as React from "react";
import { Image as ImageIcon, Move, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ImageValue, ImageField, ImageSourceProps } from "../types";
import { parseImage } from "../lib/parseImage";
import { imageStyle } from "../lib/imageStyle";
import { ImagePickerDialog } from "./ImagePickerDialog";

interface Props extends ImageSourceProps {
  image: ImageField;
  onChange: (next: ImageValue | null) => void;
  resolvedUrl?: string | null;
  className?: string;
}

export function ImageBanner({ image, onChange, resolvedUrl, onUpload, searchUnsplash, className }: Props) {
  const data = parseImage(image);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [reposition, setReposition] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const dragging = React.useRef(false);

  const setY = (clientY: number, el: HTMLElement) => {
    if (!data) return;
    const r = el.getBoundingClientRect();
    const pct = ((clientY - r.top) / r.height) * 100;
    onChange({ ...data, positionY: Math.max(0, Math.min(100, pct)) });
  };

  React.useEffect(() => {
    if (!reposition) return;
    const move = (e: MouseEvent) => { if (dragging.current && ref.current) setY(e.clientY, ref.current); };
    const up = () => { dragging.current = false; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reposition, data]);

  if (!data) return null;

  return (
    <div className="group/banner relative w-full shrink-0">
      <div
        ref={ref}
        onMouseDown={(e) => { if (!reposition) return; dragging.current = true; setY(e.clientY, e.currentTarget); }}
        className={cn("h-44 w-full md:h-56", reposition && "cursor-ns-resize ring-2 ring-inset ring-primary", className)}
        style={imageStyle(data, resolvedUrl)}
      />
      <div className={cn("absolute bottom-3 right-3 flex gap-1.5 opacity-0 transition group-hover/banner:opacity-100", reposition && "opacity-100")}>
        {reposition ? (
          <Button size="sm" variant="secondary" onClick={() => setReposition(false)}>Save position</Button>
        ) : (
          <>
            <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)}><ImageIcon className="mr-1 h-3 w-3" />Change</Button>
            <Button size="sm" variant="secondary" onClick={() => setReposition(true)}><Move className="mr-1 h-3 w-3" />Reposition</Button>
            <Button size="icon" variant="secondary" aria-label="Remove image" onClick={() => onChange(null)}><X className="h-3.5 w-3.5" /></Button>
          </>
        )}
      </div>
      <ImagePickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={onChange} onUpload={onUpload} searchUnsplash={searchUnsplash} />
    </div>
  );
}
