"use client";

import { useState } from "react";
import { Server } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppearance, type ServerMode } from "@/lib/appearance";
import { useOsApi } from "@/lib/os-api";
import { IS_DEMO } from "@/lib/demo";
import { Section } from "./section";
import { Row } from "./row";
import { StatusChip, type TestState } from "./status-chip";

const MODE_OPTS: { value: ServerMode; label: string }[] = [
  { value: "mock", label: "Mock" },
  { value: "live", label: "Live" },
];

export function ServerSection() {
  const { tweaks, setServer } = useAppearance();
  const api = useOsApi();
  const [test, setTest] = useState<TestState>(null);

  async function onTest() {
    setTest({ state: "testing" });
    try {
      const s = await api.sys.stats();
      setTest({ state: "ok", msg: `${Math.round(s.cpu.pct)}% cpu` });
    } catch (e) {
      setTest({ state: "err", msg: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <Section icon={<Server />} title="Server (VPS)">
      <Row label="Mode">
        <Segmented
          options={MODE_OPTS}
          value={IS_DEMO ? "mock" : tweaks.server.mode}
          onChange={(v) => {
            if (IS_DEMO) return; // demo is mock-only (no host access)
            setServer({ mode: v });
            setTest(null);
          }}
        />
      </Row>
      <Row label="Server URL">
        <Input
          value={tweaks.server.url}
          onChange={(e) => setServer({ url: e.target.value })}
          placeholder="https://vps.rahmanef.com"
          className="sm:w-56"
        />
      </Row>
      <Row label="Access token">
        <Input
          type="password"
          value={tweaks.server.token}
          onChange={(e) => setServer({ token: e.target.value })}
          className="sm:w-56"
        />
      </Row>
      <div className="flex items-center justify-between gap-3">
        <StatusChip test={test} />
        <Button
          size="sm"
          variant="outline"
          onClick={onTest}
          disabled={test?.state === "testing"}
        >
          Test connection
        </Button>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Live mode routes file/exec/system calls through the OsApi HTTP adapter to
        your VPS agent. Token is stored locally only.
      </p>
    </Section>
  );
}
