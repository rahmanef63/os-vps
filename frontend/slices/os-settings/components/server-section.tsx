"use client";

import { useState } from "react";
import { Laptop, Plus, Server } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  addSshTarget,
  effectiveServerTarget,
  selectServerTarget,
  updateServerTarget,
  useAppearance,
  type ServerTarget,
  type SshServerTarget,
} from "@/lib/appearance";
import { useOsApi } from "@/features/os-shell";
import { IS_DEMO } from "@/lib/demo";
import { Section } from "./section";
import { Row } from "./row";
import { StatusChip, type TestState } from "./status-chip";

function targetIcon(target: ServerTarget) {
  return target.kind === "ssh" ? <Laptop className="size-3.5" /> : <Server className="size-3.5" />;
}

function targetSubtitle(target: ServerTarget): string {
  if (target.kind === "mock") return "Safe demo data; no host access.";
  if (target.kind === "local") return "Same-origin Topside host API on this VPS.";
  return target.host ? `SSH over Tailscale: ${target.user ? `${target.user}@` : ""}${target.host}` : "Configure a Tailscale SSH host.";
}

function isSsh(target: ServerTarget): target is SshServerTarget {
  return target.kind === "ssh";
}

export function ServerSection() {
  const { tweaks, setServer } = useAppearance();
  const api = useOsApi();
  const [test, setTest] = useState<TestState>(null);
  const active = effectiveServerTarget(tweaks.server, IS_DEMO);
  const targets = tweaks.server.targets ?? [];

  async function onTest() {
    setTest({ state: "testing" });
    try {
      const s = await api.sys.stats();
      setTest({ state: "ok", msg: `${Math.round(s.cpu.pct)}% cpu` });
    } catch (e) {
      setTest({ state: "err", msg: e instanceof Error ? e.message : String(e) });
    }
  }

  function selectTarget(id: string) {
    if (IS_DEMO) return;
    setServer(selectServerTarget(tweaks.server, id));
    setTest(null);
  }

  function patchTarget(id: string, patch: Partial<ServerTarget>) {
    if (IS_DEMO) return;
    setServer(updateServerTarget(tweaks.server, id, patch));
    setTest(null);
  }

  function onAddSsh() {
    if (IS_DEMO) return;
    setServer(addSshTarget(tweaks.server));
    setTest(null);
  }

  return (
    <Section icon={<Server />} title="Server targets">
      <Tabs>
        <TabsList className="w-full flex-wrap justify-start bg-muted/70">
          {targets.map((target) => (
            <TabsTrigger
              key={target.id}
              active={(active?.id ?? "mock") === target.id}
              onClick={() => selectTarget(target.id)}
              className="flex min-h-9 items-center gap-1.5"
            >
              {targetIcon(target)}
              {target.label}
            </TabsTrigger>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-xs"
            onClick={onAddSsh}
            disabled={IS_DEMO}
          >
            <Plus className="size-3.5" />
            Add more SSH
          </Button>
        </TabsList>
      </Tabs>

      {active ? (
        <div className="rounded-xl border bg-card/45 p-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                {targetIcon(active)}
                {active.label}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {targetSubtitle(active)}
              </p>
            </div>
            <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {active.kind === "local" ? "Live" : active.kind}
            </span>
          </div>

          {active.kind === "local" ? (
            <Row label="Server URL">
              <Input
                value={active.url}
                onChange={(e) => patchTarget(active.id, { url: e.target.value })}
                placeholder="Current origin / https://vps.example.com"
                className="sm:w-64"
              />
            </Row>
          ) : null}

          {isSsh(active) ? (
            <div className="space-y-3">
              <Row label="Label">
                <Input
                  value={active.label}
                  onChange={(e) => patchTarget(active.id, { label: e.target.value })}
                  placeholder="Laptop"
                  className="sm:w-64"
                />
              </Row>
              <Row label="SSH user">
                <Input
                  value={active.user}
                  onChange={(e) => patchTarget(active.id, { user: e.target.value })}
                  placeholder="ubuntu"
                  className="sm:w-64"
                />
              </Row>
              <Row label="Tailscale host">
                <Input
                  value={active.host}
                  onChange={(e) => patchTarget(active.id, { host: e.target.value })}
                  placeholder="laptop.example-tailnet"
                  className="sm:w-64"
                />
              </Row>
              <Row label="Port">
                <Input
                  value={String(active.port)}
                  onChange={(e) => patchTarget(active.id, { port: Number(e.target.value) || 22 })}
                  inputMode="numeric"
                  className="sm:w-24"
                />
              </Row>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <StatusChip test={test} />
        <Button
          size="sm"
          variant="outline"
          onClick={onTest}
          disabled={test?.state === "testing" || active?.kind === "ssh"}
        >
          Test connection
        </Button>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        The VPS tab replaces the old Live toggle. SSH tabs intentionally store only
        public connection metadata (user, host, port); use Tailscale SSH or
        server-side keys on the VPS, never browser-stored passwords/private keys.
        SSH targets are config-ready; host actions stay on mock/local until a
        server-side SSH bridge is enabled.
      </p>
    </Section>
  );
}
