"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { DevicesPanel } from "@/features/auth";
import { SECTIONS, type SectionId } from "./nav";
import { AutoLockRow } from "./auto-lock-row";
import { AppearanceSection } from "./appearance-section";
import { ThemeSection } from "./theme-section";
import { AiSection } from "./ai-section";
import { QuicklinksSection } from "./quicklinks-section";
import { ServerSection } from "./server-section";
import { BrowserSection } from "./browser-section";
import { AboutSection } from "./about-section";

// The section content — one functional panel per SectionId, shared verbatim by
// every shell's Settings layout (the per-shell seam only swaps the navigation
// chrome around these, never the bodies).
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
          <AutoLockRow />
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

// One scrolling section pane with its heading. Shared by every layout's detail
// region (macOS sidebar detail, Windows tab pane, mobile drill-down).
export function SectionDetail({ id }: { id: SectionId }) {
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

// Compact nav: vertical section list (mobile master pane). Tapping a row drills
// the MasterDetail into the section content; the back arrow returns to this list.
export function SectionList({
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
