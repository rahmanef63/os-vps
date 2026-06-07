"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IS_DEMO } from "@/lib/demo";
import { Section } from "./section";
import { Row } from "./row";
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

// Read-only status of the os-browser runtime (the Playwright Chromium sidecar).
// All control is via systemd on the host — this panel never mutates the service.
export function BrowserSection() {
  const [test, setTest] = useState<TestState>(null);
  const [info, setInfo] = useState<Info | null>(null);

  async function onTest() {
    setTest({ state: "testing" });
    setInfo(null);
    try {
      const r = await fetch("/api/v1/browser/info", { cache: "no-store" });
      if (!r.ok) throw new Error(r.status === 501 ? "not configured" : `http_${r.status}`);
      const data = (await r.json()) as Info;
      setInfo(data);
      setTest({ state: "ok", msg: data.headless ? "headless" : "headed" });
    } catch (e) {
      setTest({ state: "err", msg: e instanceof Error ? e.message : String(e) });
    }
  }

  if (IS_DEMO)
    return (
      <Section icon={<Globe />} title="Browser runtime">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          The remote browser is disabled in the demo. In a live deployment this
          shows the Playwright Chromium sidecar status.
        </p>
      </Section>
    );

  return (
    <Section icon={<Globe />} title="Browser runtime">
      <div className="flex items-center justify-between gap-3">
        <StatusChip test={test} />
        <Button size="sm" variant="outline" onClick={onTest} disabled={test?.state === "testing"}>
          Check status
        </Button>
      </div>
      {info && (
        <>
          <Row label="Current URL">
            <span className="truncate text-[12px] text-muted-foreground">{info.url || "about:blank"}</span>
          </Row>
          <Row label="Viewport">
            <span className="text-[12px] text-muted-foreground">
              {info.viewport.width}×{info.viewport.height}
            </span>
          </Row>
          <Row label="Mode">
            <span className="text-[12px] text-muted-foreground">{info.headless ? "Headless" : "Headed"}</span>
          </Row>
          <Row label="Extension">
            <span className="truncate text-[12px] text-muted-foreground">{info.extension ?? "none"}</span>
          </Row>
          <Row label="Idle reset">
            <span className="text-[12px] text-muted-foreground">
              {info.idleMs > 0 ? `${Math.round(info.idleMs / 1000)}s` : "off"}
            </span>
          </Row>
          <Row label="Profile">
            <span className="truncate text-[12px] text-muted-foreground">{info.profile}</span>
          </Row>
        </>
      )}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        A real Chromium on the VPS, loopback-bound (127.0.0.1:4002) behind a
        shared secret. Start/stop via systemd (<code>os-browser.service</code>).
        Login cookies persist in the profile across restarts.
      </p>
    </Section>
  );
}
