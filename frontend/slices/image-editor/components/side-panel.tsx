"use client";

import { Bot, Sparkles, SlidersHorizontal, Settings2, Download, Layers } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/features/image-editor/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { LayersPanel } from "./panels/layers-panel";
import { LayerStylesPanel } from "./panels/layer-styles-panel";
import { AdjustPanel } from "./panels/adjust-panel";
import { PropertiesPanel } from "./panels/properties-panel";
import { ExportPanel } from "./panels/export-panel";
import { AiPanel } from "./panels/ai-panel";

// A labeled tab (icon + short text) — discoverable, unlike bare icons.
function Tab({ value, icon: Icon, label }: { value: string; icon: typeof Bot; label: string }) {
  return (
    <TabsTrigger
      value={value}
      className="flex flex-col items-center gap-0.5 rounded-none border-b-2 border-transparent py-1.5 text-[11px] text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-accent data-[state=active]:text-foreground"
    >
      <Icon className="size-4" />
      {label}
    </TabsTrigger>
  );
}

// Right dock, familiar editor layout: the contextual PROPERTIES group on top
// (selection-aware — document, layer type, transform), the signature LAYERS
// group on the bottom. Adjust / Effects / Export / AI are sibling tabs; the AI
// assistant is opt-in (last tab), NOT the default. Drag the divider to rebalance.
export function SidePanel() {
  return (
    <div className="flex w-[312px] max-w-[45vw] shrink-0 flex-col border-l border-border bg-card">
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel defaultSize={40} minSize={22}>
          <Tabs defaultValue="props" className="flex h-full flex-col">
            <TabsList className="grid w-full shrink-0 grid-cols-5 rounded-none border-b border-border bg-transparent p-0">
              <Tab value="props" icon={Settings2} label="Properties" />
              <Tab value="adjust" icon={SlidersHorizontal} label="Adjust" />
              <Tab value="style" icon={Sparkles} label="Effects" />
              <Tab value="export" icon={Download} label="Export" />
              <Tab value="ai" icon={Bot} label="AI" />
            </TabsList>
            <TabsContent value="props" className="m-0 min-h-0 flex-1 overflow-hidden"><ScrollArea className="h-full"><PropertiesPanel /></ScrollArea></TabsContent>
            <TabsContent value="adjust" className="m-0 min-h-0 flex-1 overflow-hidden"><ScrollArea className="h-full"><AdjustPanel /></ScrollArea></TabsContent>
            <TabsContent value="style" className="m-0 min-h-0 flex-1 overflow-hidden"><ScrollArea className="h-full"><LayerStylesPanel /></ScrollArea></TabsContent>
            <TabsContent value="export" className="m-0 min-h-0 flex-1 overflow-hidden"><ScrollArea className="h-full"><ExportPanel /></ScrollArea></TabsContent>
            {/* AI manages its own scroll + input. */}
            <TabsContent value="ai" className="m-0 min-h-0 flex-1 overflow-hidden"><AiPanel /></TabsContent>
          </Tabs>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={60} minSize={20}>
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Layers className="size-3.5" /> Layers
            </div>
            <div className="min-h-0 flex-1">
              {/* LayersPanel is h-full + self-scrolling — no extra ScrollArea. */}
              <LayersPanel />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
