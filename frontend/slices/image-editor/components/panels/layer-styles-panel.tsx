"use client";

import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Slider } from "@/features/image-editor/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useEditor } from "../../lib/store";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <Separator />
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        {value ? <span className="text-xs tabular-nums text-muted-foreground">{value}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function LayerStylesPanel() {
  const { selected, patchStyle, patchShadow, patchGlow, patchStroke } = useEditor();

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Select a layer</p>
      </div>
    );
  }

  const id = selected.id;
  const { stroke, shadow, glow, clipBelow } = selected.style;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4">
        <Section title="Stroke">
          <Toggle label="Enabled" checked={stroke.enabled} onCheckedChange={(enabled) => patchStroke(id, { enabled })} />
          <Row label="Color">
            <Input
              type="color"
              value={stroke.color}
              disabled={!stroke.enabled}
              onChange={(e) => patchStroke(id, { color: e.target.value })}
              className={cn("h-9 w-full p-1")}
            />
          </Row>
          <Row label="Width" value={`${stroke.width}px`}>
            <Slider
              min={0}
              max={40}
              step={1}
              value={[stroke.width]}
              disabled={!stroke.enabled}
              onValueChange={([width]) => patchStroke(id, { width })}
            />
          </Row>
        </Section>

        <Section title="Drop Shadow">
          <Toggle label="Enabled" checked={shadow.enabled} onCheckedChange={(enabled) => patchShadow(id, { enabled })} />
          <Row label="Color">
            <Input
              type="color"
              value={shadow.color}
              disabled={!shadow.enabled}
              onChange={(e) => patchShadow(id, { color: e.target.value })}
              className={cn("h-9 w-full p-1")}
            />
          </Row>
          <Row label="Angle" value={`${shadow.angle}°`}>
            <Slider
              min={0}
              max={360}
              step={1}
              value={[shadow.angle]}
              disabled={!shadow.enabled}
              onValueChange={([angle]) => patchShadow(id, { angle })}
            />
          </Row>
          <Row label="Distance" value={`${shadow.distance}px`}>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[shadow.distance]}
              disabled={!shadow.enabled}
              onValueChange={([distance]) => patchShadow(id, { distance })}
            />
          </Row>
          <Row label="Size" value={`${shadow.size}px`}>
            <Slider
              min={0}
              max={80}
              step={1}
              value={[shadow.size]}
              disabled={!shadow.enabled}
              onValueChange={([size]) => patchShadow(id, { size })}
            />
          </Row>
          <Row label="Opacity" value={`${Math.round(shadow.opacity * 100)}%`}>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[Math.round(shadow.opacity * 100)]}
              disabled={!shadow.enabled}
              onValueChange={([o]) => patchShadow(id, { opacity: o / 100 })}
            />
          </Row>
        </Section>

        <Section title="Outer Glow">
          <Toggle label="Enabled" checked={glow.enabled} onCheckedChange={(enabled) => patchGlow(id, { enabled })} />
          <Row label="Color">
            <Input
              type="color"
              value={glow.color}
              disabled={!glow.enabled}
              onChange={(e) => patchGlow(id, { color: e.target.value })}
              className={cn("h-9 w-full p-1")}
            />
          </Row>
          <Row label="Size" value={`${glow.size}px`}>
            <Slider
              min={0}
              max={80}
              step={1}
              value={[glow.size]}
              disabled={!glow.enabled}
              onValueChange={([size]) => patchGlow(id, { size })}
            />
          </Row>
          <Row label="Opacity" value={`${Math.round(glow.opacity * 100)}%`}>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[Math.round(glow.opacity * 100)]}
              disabled={!glow.enabled}
              onValueChange={([o]) => patchGlow(id, { opacity: o / 100 })}
            />
          </Row>
        </Section>

        <Section title="Clipping Mask">
          <Toggle label="Clip below" checked={clipBelow} onCheckedChange={(clip) => patchStyle(id, { clipBelow: clip })} />
          <p className="text-xs text-muted-foreground">Clip to layer below</p>
        </Section>
      </div>
    </ScrollArea>
  );
}
