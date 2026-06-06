"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppearance } from "@/lib/appearance";
import { AppFrame, usePublishInspector } from "@/features/os-shell";
import { SettingsSection as Section } from "@/features/shell-settings";
import { DevicesPanel } from "@/features/auth";
import { AppearanceSection } from "./components/appearance-section";
import { AiSection } from "./components/ai-section";
import { ServerSection } from "./components/server-section";
import { AboutSection } from "./components/about-section";

// Default export so os-shell can lazy-load it as a window app.
export default function OsSettings() {
  const { tweaks } = useAppearance();
  const [model, setModel] = useState("default");
  useEffect(() => {
    fetch("/api/config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => c?.model && setModel(c.model as string))
      .catch(() => {});
  }, []);

  // Surface system preferences to the shell AI Inspector.
  usePublishInspector(
    "os-settings",
    {
      subject: "System Settings",
      props: [
        { label: "Theme", value: tweaks.theme },
        { label: "Accent", value: tweaks.accent },
        { label: "Device", value: tweaks.device },
        { label: "Server mode", value: tweaks.server.mode },
        { label: "AI model", value: model },
      ],
      context: `Settings: theme ${tweaks.theme}, server ${tweaks.server.mode}`,
      suggestions: [
        "What does Live mode do?",
        "Recommended settings",
        "Explain device approval",
      ],
    },
    [tweaks.theme, tweaks.accent, tweaks.device, tweaks.server.mode, model],
  );

  return (
    <AppFrame>
      <ScrollArea className="h-full">
      <div className="space-y-6 p-5">
        <AppearanceSection />

        <AiSection />

        <Section icon={<ShieldCheck />} title="Devices">
          <DevicesPanel />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Each browser is a device gated by password + approval. Approve a
            pending device to grant it access; revoke to cut it off.
          </p>
        </Section>

        <ServerSection />

        <AboutSection />
      </div>
      </ScrollArea>
    </AppFrame>
  );
}
