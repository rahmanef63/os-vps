"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, RefreshCw } from "lucide-react";
import { IS_DEMO } from "@/lib/demo";
import {
  SettingsSection,
  SettingsRow,
  SettingsValueRow,
  SettingsActionRow,
} from "@/features/shell-settings";
import { StatusChip, type TestState } from "./status-chip";

type Info = {
  ok: boolean;
  url: string;
  profile: string;
  viewport: { width: number; height: number };
  headless: boolean;
  extension: string | null;
  idleMs: number;
};

const RUNTIME_NOTE = (
  <>
    A real Chromium on the VPS, loopback-bound (127.0.0.1:4002) behind a shared
    secret. Start/stop via systemd (<code>os-browser.service</code>). Login
    cookies persist in the profile across restarts.
  </>
);

// Read-only status of the os-browser runtime (the Playwright Chromium sidecar).
// All control is via systemd on the host — this panel never mutates the service.
export function BrowserSection() {
  const [test, setTest] = useState<TestState>(null);
  const [info, setInfo] = useState<Info | null>(null);

  // Pure fetch (no setState) so the mount effect can use the .then form
  // (react-hooks/set-state-in-effect), like ai-section.
  const fetchInfo = useCallback(async (): Promise<{ info: Info | null; test: TestState }> => {
    try {
      const r = await fetch("/api/v1/browser/info", { cache: "no-store" });
      if (!r.ok) throw new Error(r.status === 501 ? "not configured" : `http_${r.status}`);
      const data = (await r.json()) as Info;
      return { info: data, test: { state: "ok", msg: data.headless ? "headless" : "headed" } };
    } catch (e) {
      return { info: null, test: { state: "err", msg: e instanceof Error ? e.message : String(e) } };
    }
  }, []);

  const refresh = useCallback(() => {
    setTest({ state: "testing" });
    fetchInfo().then(({ info, test }) => {
      setInfo(info);
      setTest(test);
    });
  }, [fetchInfo]);

  // Auto-fetch on mount so the value rows are populated immediately (not gated
  // behind a manual button that leaves the group looking empty).
  useEffect(() => {
    if (IS_DEMO) return;
    let alive = true;
    fetchInfo().then(({ info, test }) => {
      if (!alive) return;
      setInfo(info);
      setTest(test);
    });
    return () => {
      alive = false;
    };
  }, [fetchInfo]);

  if (IS_DEMO)
    return (
      <SettingsSection
        icon={<Globe />}
        title="Browser runtime"
        footnote="The remote browser is disabled in the demo. In a live deployment this shows the Playwright Chromium sidecar status."
      >
        <SettingsValueRow label="Status" value="Disabled in demo" />
      </SettingsSection>
    );

  return (
    <SettingsSection icon={<Globe />} title="Browser runtime" footnote={RUNTIME_NOTE}>
      <SettingsRow label="Status">
        {test ? <StatusChip test={test} /> : <span className="text-[13px] text-muted-foreground">—</span>}
      </SettingsRow>
      <SettingsValueRow label="Current URL" value={info?.url || "about:blank"} />
      <SettingsValueRow label="Viewport" value={info ? `${info.viewport.width}×${info.viewport.height}` : "—"} />
      <SettingsValueRow label="Mode" value={info ? (info.headless ? "Headless" : "Headed") : "—"} />
      <SettingsValueRow label="Extension" value={info?.extension ?? (info ? "none" : "—")} />
      <SettingsValueRow
        label="Idle reset"
        value={info ? (info.idleMs > 0 ? `${Math.round(info.idleMs / 1000)}s` : "off") : "—"}
      />
      <SettingsValueRow label="Profile" value={info?.profile || "—"} />
      <SettingsActionRow label="Refresh" icon={<RefreshCw />} onClick={refresh} busy={test?.state === "testing"} />
    </SettingsSection>
  );
}
