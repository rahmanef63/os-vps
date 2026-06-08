"use client";

/** ImagePickerDialog — the 4-tab image chooser (Gallery · Upload · Link ·
 *  Unsplash). Upload tab appears only when `onUpload` is wired; Unsplash
 *  live-search only when `searchUnsplash` is wired (else it browses the curated
 *  set). Usually you don't render this directly — use ImagePickerButton, which
 *  owns the trigger + open state. */

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ImageValue, ImageSourceProps } from "../types";
import { GalleryTab } from "./image-picker/GalleryTab";
import { UploadTab } from "./image-picker/UploadTab";
import { LinkTab } from "./image-picker/LinkTab";
import { UnsplashTab } from "./image-picker/UnsplashTab";

type Tab = "gallery" | "upload" | "link" | "unsplash";

interface Props extends ImageSourceProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelect: (c: ImageValue) => void;
  title?: string;
  /** Pre-fill + auto-run the Unsplash search (opens on that tab). */
  defaultQuery?: string;
}

export function ImagePickerDialog({ open, onOpenChange, onSelect, onUpload, searchUnsplash, title = "Choose image", defaultQuery }: Props) {
  const [tab, setTab] = React.useState<Tab>(defaultQuery ? "unsplash" : "gallery");
  const tabs: { id: Tab; label: string }[] = [
    { id: "gallery", label: "Gallery" },
    ...(onUpload ? [{ id: "upload" as const, label: "Upload" }] : []),
    { id: "link", label: "Link" },
    { id: "unsplash", label: "Unsplash" },
  ];
  const handle = (c: ImageValue) => { onSelect(c); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="text-sm">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
          {tabs.map((t) => (
            <button
              key={t.id} type="button" onClick={() => setTab(t.id)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition",
                tab === t.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="h-[440px] overflow-y-auto">
          {tab === "gallery" && <GalleryTab onSelect={handle} />}
          {tab === "upload" && onUpload && <UploadTab onSelect={handle} onUpload={onUpload} />}
          {tab === "link" && <LinkTab onSelect={handle} />}
          {tab === "unsplash" && <UnsplashTab onSelect={handle} searchUnsplash={searchUnsplash} defaultQuery={defaultQuery} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
