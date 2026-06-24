"use client";

import { useState, type ReactNode } from "react";
import { HardDriveDownload, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditorSlider as Slider } from "@/features/image-editor";
import { toast } from "@/features/os-shell";
import { loadSavePrefs, saveImageToHost, saveSavePrefs, type SaveFormat } from "../lib/save-image";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// "Save As" dialog — choose a VPS folder + name + format, with a "remember my
// choice" checkbox that makes future saves go there silently (handled in app.tsx).
export function SaveImageDialog({
  dataUrl,
  open,
  onClose,
  onSaved,
}: {
  dataUrl: string | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const init = loadSavePrefs();
  const [dir, setDir] = useState(init.dir);
  const [name, setName] = useState("image");
  const [format, setFormat] = useState<SaveFormat>(init.format);
  const [quality, setQuality] = useState(init.quality);
  const [remember, setRemember] = useState(init.remember);
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    if (!dataUrl) return;
    setBusy(true);
    try {
      const path = await saveImageToHost(dataUrl, { dir, name: name.trim() || "image", format, quality });
      saveSavePrefs({ dir, format, quality, remember });
      toast(`Saved → ${path}`, { tone: "success" });
      onSaved?.();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "save failed", { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDriveDownload className="size-4" /> Save image to VPS
          </DialogTitle>
          <DialogDescription>Write the rendered canvas to a folder on the server.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1 text-sm">
          <Field label="Folder">
            <Input value={dir} onChange={(e) => setDir(e.target.value)} placeholder="~/Pictures/Studio" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="File name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Format">
              <Select value={format} onValueChange={(v) => setFormat(v as SaveFormat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="jpeg">JPG</SelectItem>
                  <SelectItem value="webp">WebP</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {format !== "png" && (
            <Field label={`Quality ${quality}%`}>
              <Slider min={10} max={100} value={[quality]} onValueChange={([v]) => setQuality(v)} />
            </Field>
          )}
          <label className="mt-1 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 accent-primary"
            />
            Remember my choice — save here next time without asking
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handleSave} disabled={busy || !dataUrl} className="gap-1.5">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <HardDriveDownload className="size-4" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
