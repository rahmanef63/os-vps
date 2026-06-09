"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppearance, effectiveServerTarget } from "@/lib/appearance";
import { IS_DEMO } from "@/lib/demo";
import { AppFrame, usePublishInspector, toast } from "@/features/os-shell";
import { DevicesPanel } from "@/features/auth";
import { SettingsTabs, SECTIONS, type SectionId } from "./components/nav";
import { AppearanceSection } from "./components/appearance-section";
import { ThemeSection } from "./components/theme-section";
import { AiSection } from "./components/ai-section";
import { QuicklinksSection } from "./components/quicklinks-section";
import { ServerSection } from "./components/server-section";
import { BrowserSection } from "./components/browser-section";
import { AboutSection } from "./components/about-section";

// System Settings layout: a top tab strip (every section visible at a glance,
// scrolls horizontally on narrow windows) over one scrolling section pane.
// Same on desktop + mobile — no master/detail drill-down.
function SectionBody({ id }: { id: SectionId }) {
  switch (id) {
    case "appearance":
      return <AppearanceSection />;
    case "theme":
      return <ThemeSection />;
    case "ai":
      return <AiSection />;
    case "quicklinks":
      return <QuicklinksSection />;
    case "devices":
      return (
        <div className="space-y-3">
          <DevicesPanel />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Each browser is a device gated by password + approval. Approve a
            pending device to grant it access; revoke to cut it off.
          </p>
        </div>
      );
    case "server":
      return <ServerSection />;
    case "browser":
      return <BrowserSection />;
    case "about":
      return <AboutSection />;
  }
}

function SectionDetail({ id }: { id: SectionId }) {
  const meta = SECTIONS.find((s) => s.id === id);
  return (
    <ScrollArea className="h-full">
      <div className="mx-auto min-w-0 max-w-3xl space-y-4 overflow-x-hidden p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:space-y-5 sm:p-5">
        {meta && (
          <header className="space-y-0.5">
            <h2 className="text-sm font-semibold leading-tight">{meta.label}</h2>
            <p className="text-xs text-muted-foreground">{meta.blurb}</p>
          </header>
        )}
        <SectionBody id={id} />
      </div>
    </ScrollArea>
  );
}

// Default export so os-shell can lazy-load it as a window app.
export default function OsSettings() {
  const { tweaks } = useAppearance();
  const [model, setModel] = useState("default");
  const [active, setActive] = useState<SectionId>("appearance");
  const serverTarget = effectiveServerTarget(tweaks.server);

  useEffect(() => {
    // Demo never calls /api (no auth) — the fetch would 401 and greet every
    // visitor with an error toast. The default model label stands in.
    if (IS_DEMO) return;
    fetch("/api/config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((c) => c?.model && setModel(c.model as string))
      .catch(() => toast("Failed to load AI config", { tone: "error" }));
  }, []);

  // Surface system preferences to the shell AI Inspector.
  usePublishInspector(
    "os-settings",
    {
      subject: "System Settings",
      props: [
        { label: "Theme", value: tweaks.preset ?? "stock" },
        { label: "Mode", value: tweaks.theme },
        { label: "Device", value: tweaks.device },
        { label: "Font", value: `${Math.round(tweaks.fontScale * 100)}%` },
        { label: "Wallpaper", value: tweaks.wallpaperImage ? "custom image" : tweaks.wallpaper },
        { label: "Server target", value: serverTarget?.label ?? tweaks.server.mode },
        { label: "AI model", value: model },
      ],
      context: `Settings: theme ${tweaks.theme}, server target ${serverTarget?.label ?? tweaks.server.mode}`,
      suggestions: [
        "What do server target tabs do?",
        "Recommended settings",
        "Explain device approval",
      ],
    },
    [tweaks.theme, tweaks.preset, tweaks.device, tweaks.fontScale, tweaks.wallpaper, tweaks.wallpaperImage, tweaks.server.mode, serverTarget?.label, model],
  );

  return (
    <AppFrame
      toolbar={
        <div className="bg-sidebar/40">
          <SettingsTabs active={active} onSelect={setActive} />
        </div>
      }
    >
      <SectionDetail id={active} />
    </AppFrame>
  );
}
