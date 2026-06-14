"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppearance, effectiveServerTarget } from "@/lib/appearance";
import { IS_DEMO } from "@/lib/demo";
import {
  AppFrame,
  MasterDetail,
  useResponsive,
  usePublishInspector,
  toast,
} from "@/features/os-shell";
import { DevicesPanel } from "@/features/auth";
import { SettingsTabs, SECTIONS, type SectionId } from "./components/nav";
import { AppearanceSection } from "./components/appearance-section";
import { ThemeSection } from "./components/theme-section";
import { AiSection } from "./components/ai-section";
import { QuicklinksSection } from "./components/quicklinks-section";
import { ServerSection } from "./components/server-section";
import { BrowserSection } from "./components/browser-section";
import { AboutSection } from "./components/about-section";

// System Settings layout: on desktop a top tab strip (every section visible at
// a glance, scrolls horizontally on narrow windows) over one scrolling section
// pane; on mobile a MasterDetail drill-down (section list ↔ section pane).
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
      <div className="mx-auto min-w-0 max-w-3xl space-y-4 overflow-x-hidden p-3 pb-[max(1rem,var(--sai-bottom,0px))] sm:space-y-5 sm:p-5">
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

// Compact nav: vertical section list (master pane). Tapping a row drills the
// MasterDetail into the section content; the back arrow returns to this list.
function SectionList({
  active,
  onSelect,
}: {
  active: SectionId | null;
  onSelect: (id: SectionId) => void;
}) {
  return (
    <nav role="tablist" aria-label="Settings sections" className="flex flex-col p-2">
      {SECTIONS.map(({ id, label, blurb, icon: Icon }) => {
        const on = id === active;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(id)}
            className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium leading-tight transition-colors ${on ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-accent"}`}
          >
            <Icon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{label}</span>
              <span className="block truncate text-[11px] font-normal text-muted-foreground">
                {blurb}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// Default export so os-shell can lazy-load it as a window app.
export default function OsSettings() {
  const { tweaks } = useAppearance();
  const { isMobile } = useResponsive();
  const [model, setModel] = useState("default");
  // On mobile we start on the section list (no selection drilled in); desktop
  // tabs always show a selected pane. `null` = list view, an id = detail view.
  const [active, setActive] = useState<SectionId | null>(
    isMobile ? null : "appearance",
  );
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

  // Mobile: MasterDetail drill-down (section list → tap → section pane → back).
  // Desktop: the historical top tab strip — every section visible at a glance.
  if (isMobile) {
    return (
      <AppFrame>
        <MasterDetail
          master={<SectionList active={active} onSelect={setActive} />}
          detail={active ? <SectionDetail id={active} /> : null}
          hasSelection={active !== null}
          onBack={() => setActive(null)}
          backLabel="Settings"
          masterClassName="w-full"
        />
      </AppFrame>
    );
  }

  const desktopActive: SectionId = active ?? "appearance";
  return (
    <AppFrame
      toolbar={
        <div className="bg-sidebar/40">
          <SettingsTabs active={desktopActive} onSelect={setActive} />
        </div>
      }
    >
      <SectionDetail id={desktopActive} />
    </AppFrame>
  );
}
