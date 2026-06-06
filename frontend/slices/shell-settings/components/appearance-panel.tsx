"use client";

import { Layers, Monitor, Palette } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { SettingsSection } from "./section";
import { SettingsRow } from "./row";
import { AccentSwatches } from "./accent-swatches";
import type { AppearanceAdapter, SegSetting } from "../lib/types";

function SegRow({ label, seg }: { label: string; seg: SegSetting }) {
  return (
    <SettingsRow label={label}>
      <Segmented options={seg.options} value={seg.value} onChange={seg.onChange} className="flex-wrap" />
    </SettingsRow>
  );
}

// Generic shell appearance UI — Appearance group + an optional Display group for
// the device override. Everything it shows comes from the injected adapter, so the
// panel itself is brand-free and lift-ready.
export function AppearancePanel({ appearance: a }: { appearance: AppearanceAdapter }) {
  return (
    <>
      <SettingsSection icon={<Palette />} title="Appearance">
        {a.style && <SegRow label="Style" seg={a.style} />}
        <SegRow label="Theme" seg={a.theme} />
        {a.accent && (
          <SettingsRow label="Accent">
            <AccentSwatches value={a.accent.value} options={a.accent.options} onSelect={a.accent.onChange} />
          </SettingsRow>
        )}
        {a.wallpaper && <SegRow label="Wallpaper" seg={a.wallpaper} />}
        {a.reduceTransparency && (
          <SettingsRow label="Reduce transparency">
            <Switch checked={a.reduceTransparency.value} onCheckedChange={a.reduceTransparency.onChange} />
          </SettingsRow>
        )}
      </SettingsSection>

      {(a.shellDesktop || a.shellMobile) && (
        <SettingsSection icon={<Layers />} title="Shell">
          {a.shellDesktop && <SegRow label="Desktop layout" seg={a.shellDesktop} />}
          {a.shellMobile && <SegRow label="Mobile layout" seg={a.shellMobile} />}
        </SettingsSection>
      )}

      {a.device && (
        <SettingsSection icon={<Monitor />} title="Display">
          <SegRow label="Device" seg={a.device} />
        </SettingsSection>
      )}
    </>
  );
}
