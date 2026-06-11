"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/features/image-editor/ui/slider";
import { cn } from "@/lib/utils";
import { useEditor } from "../../lib/store";
import { exportStage, type ExportFormat } from "../../lib/export";

export function ExportPanel() {
  const { stageRef, doc, docView } = useEditor();
  const [format, setFormat] = useState<ExportFormat>("png");
  const [quality, setQuality] = useState(92);
  const [scale, setScale] = useState(1);
  const [name, setName] = useState("export");

  const isPng = format === "png";

  function handleExport() {
    const stage = stageRef.current;
    if (!stage) return;
    exportStage(stage, {
      format,
      quality: quality / 100,
      scale,
      view: docView(),
      name,
    });
  }

  return (
    <div className="space-y-4 p-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Export
      </h3>

      <Separator />

      <div className="space-y-2">
        <Label className="text-sm">Format</Label>
        <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="png">PNG</SelectItem>
            <SelectItem value="jpeg">JPG</SelectItem>
            <SelectItem value="webp">WebP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className={cn("text-sm", isPng && "text-muted-foreground")}>
            Quality
          </Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {`${quality}%`}
          </span>
        </div>
        <Slider
          min={10}
          max={100}
          step={1}
          value={[quality]}
          onValueChange={([v]) => setQuality(v)}
          disabled={isPng}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Scale</Label>
        <Select value={String(scale)} onValueChange={(v) => setScale(Number(v))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1×</SelectItem>
            <SelectItem value="2">2×</SelectItem>
            <SelectItem value="3">3×</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground tabular-nums">
          {`${doc.width * scale} × ${doc.height * scale}px`}
        </p>
      </div>

      <Separator />

      <Button className={cn("w-full gap-1.5")} onClick={handleExport}>
        <Download className="size-4" />
        Export
      </Button>
    </div>
  );
}
