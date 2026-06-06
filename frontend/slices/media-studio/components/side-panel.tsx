"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Adjustments, AdjustKey } from "../lib/filters";
import type { Layer, LayerKind } from "../lib/model";
import type { SafePlatform } from "../lib/masks";
import { LayersPanel } from "./panel/layers-panel";
import { TransformPanel } from "./panel/transform-panel";
import { AdjustPanel } from "./panel/adjust-panel";

export type PanelTab = "layers" | "adjust";

// Right dock: tab switch between the layers/transform editor and the
// adjust+filters+aspect controls.
export function SidePanel({
  tab,
  onTab,
  layers,
  selected,
  selectedLayer,
  adjustments,
  activeFilter,
  aspect,
  safe,
  platform,
  onSelect,
  onToggle,
  onOpacity,
  onMove,
  onDelete,
  onRename,
  onAdd,
  onUpdate,
  onAdjust,
  onFilter,
  onAspect,
  onReset,
  onSafe,
  onPlatform,
}: {
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  layers: Layer[];
  selected: string | null;
  selectedLayer: Layer | undefined;
  adjustments: Adjustments;
  activeFilter: string;
  aspect: string;
  safe: boolean;
  platform: SafePlatform;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onOpacity: (id: string, v: number) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onAdd: (kind: LayerKind) => void;
  onUpdate: (patch: Partial<Layer>) => void;
  onAdjust: (key: AdjustKey, value: number) => void;
  onFilter: (name: string) => void;
  onAspect: (value: string) => void;
  onReset: () => void;
  onSafe: (v: boolean) => void;
  onPlatform: (p: SafePlatform) => void;
}) {
  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-4 p-4">
        <Tabs>
          <TabsList className="w-full">
            <TabsTrigger
              active={tab === "layers"}
              onClick={() => onTab("layers")}
              className="flex-1"
            >
              Layers
            </TabsTrigger>
            <TabsTrigger
              active={tab === "adjust"}
              onClick={() => onTab("adjust")}
              className="flex-1"
            >
              Adjust
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "layers" ? (
          <>
            <LayersPanel
              layers={layers}
              selected={selected}
              onSelect={onSelect}
              onToggle={onToggle}
              onOpacity={onOpacity}
              onMove={onMove}
              onDelete={onDelete}
              onRename={onRename}
              onAdd={onAdd}
            />
            {selectedLayer && (
              <TransformPanel layer={selectedLayer} onUpdate={onUpdate} />
            )}
          </>
        ) : (
          <AdjustPanel
            adjustments={adjustments}
            activeFilter={activeFilter}
            aspect={aspect}
            safe={safe}
            platform={platform}
            onAdjust={onAdjust}
            onFilter={onFilter}
            onAspect={onAspect}
            onReset={onReset}
            onSafe={onSafe}
            onPlatform={onPlatform}
          />
        )}
      </div>
    </ScrollArea>
  );
}
