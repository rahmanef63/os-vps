"use client";

import { useState, type ReactNode } from "react";
import { Clock3, SlidersHorizontal, Sparkles, FolderOpen } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { PanelMode } from "./toolbar";

type TabId = "timeline" | "edit" | "ai" | "files";

const TABS: { id: TabId; label: string; icon: typeof Clock3 }[] = [
  { id: "timeline", label: "Timeline", icon: Clock3 },
  { id: "edit", label: "Edit", icon: SlidersHorizontal },
  { id: "ai", label: "AI", icon: Sparkles },
  { id: "files", label: "Files", icon: FolderOpen },
];

// Compact (narrow pane) lower region: the desktop's side-by-side panes become
// TABS under the always-visible preview — timeline, clip/comp props, AI chat,
// and the project files pane all reachable at ~390px without overlap.
// `panelRequest` (the "open the panel" intent fired by the menu/toolbar) jumps
// to the Edit or AI tab per the current mode, then acknowledges.
export function CompactPanes({
  mode,
  panelRequest,
  onPanelRequestDone,
  timeline,
  panel,
  files,
}: {
  mode: PanelMode;
  panelRequest: boolean;
  onPanelRequestDone: () => void;
  timeline: ReactNode;
  panel: (mode: PanelMode) => ReactNode;
  files: ReactNode;
}) {
  const [picked, setPicked] = useState<TabId>("timeline");
  // The request is consumed declaratively (no effect): while pending it OWNS the
  // shown tab (Edit or AI per mode); the user's next explicit pick clears it.
  const tab: TabId = panelRequest ? (mode === "ai" ? "ai" : "edit") : picked;
  const setTab = (id: TabId) => {
    setPicked(id);
    if (panelRequest) onPanelRequestDone();
  };

  return (
    <div className="flex h-2/5 min-h-[200px] flex-none flex-col border-t border-border bg-card">
      <Tabs className="min-h-0 flex-1">
        <TabsList className="w-full shrink-0 justify-stretch rounded-none border-b border-border bg-transparent p-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              active={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "flex min-h-9 flex-1 flex-col items-center justify-center gap-0.5 rounded-none border-b-2 border-transparent py-1 text-[11px] shadow-none",
                tab === id && "border-primary",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden [padding-bottom:var(--sai-bottom,0px)]">
          {tab === "timeline" && timeline}
          {tab === "edit" && panel("editor")}
          {tab === "ai" && panel("ai")}
          {tab === "files" && files}
        </div>
      </Tabs>
    </div>
  );
}
