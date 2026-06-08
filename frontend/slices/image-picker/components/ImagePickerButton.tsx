"use client";

/** ImagePickerButton — the headline API: ONE button that opens the
 *  ImagePickerDialog. Pick a colour / gradient / texture, upload a file, paste
 *  a URL, or grab an Unsplash photo — `onChange` fires with the chosen
 *  ImageValue. Use it anywhere you let a user set an image: page cover, profile
 *  header, card hero, wallpaper, banner. Pass `trigger` to swap the button for
 *  any node, or `label` / `variant` / `size` to restyle the default. Backend is
 *  injected (onUpload + searchUnsplash) so the slice stays portable. */

import * as React from "react";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ImageValue, ImageSourceProps } from "../types";
import { ImagePickerDialog } from "./ImagePickerDialog";

interface Props extends ImageSourceProps {
  onChange: (img: ImageValue) => void;
  /** Default-button text (ignored when `trigger` is supplied). */
  label?: string;
  /** Dialog heading. */
  title?: string;
  /** Override the default button with any clickable node. */
  trigger?: React.ReactNode;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  /** Pre-fill + auto-run the Unsplash search (opens on that tab). */
  defaultQuery?: string;
}

export function ImagePickerButton({
  onChange, label = "Choose image", title, trigger, className,
  variant = "outline", size = "sm", onUpload, searchUnsplash, defaultQuery,
}: Props) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      {trigger ? (
        <span className="contents" onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
          <ImageIcon className="mr-1.5 h-4 w-4" /> {label}
        </Button>
      )}
      <ImagePickerDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={onChange}
        onUpload={onUpload}
        searchUnsplash={searchUnsplash}
        title={title}
        defaultQuery={defaultQuery}
      />
    </>
  );
}
