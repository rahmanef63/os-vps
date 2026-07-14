"use client";

import { useState } from "react";
import { Check, Laptop, Plus, Server } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
import {
  SettingsSection,
  SettingsRow,
  SettingsValueRow,
  SettingsActionRow,
} from "@/features/shell-settings";
import { StatusChip, type TestState } from "./status-chip";

function targetIcon(target: ServerTarget) {
  return target.kind === "ssh" ? <Laptop className="size-4" /> : <Server className="size-4" />;
}

function targetSubtitle(target: ServerTarget): string {
  if (target.kind === "mock") return "Safe demo data; no host access.";
  if (target.kind === "local") return "Same-origin Topside host API on this VPS.";
  return target.host ? `SSH over Tailscale: ${target.user ? `${target.user}@` : ""}${target.host}` : "Configure a Tailscale SSH host.";
}

// Friendly kind label — never the raw enum ("ssh"/"mock").
function kindLabel(target: ServerTarget): string {
  if (target.kind === "local") return "Live";
  if (target.kind === "mock") return "Mock";
  return "SSH — not connected";
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
  const activeId = active?.id ?? "mock";

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
    <div className="space-y-4 sm:space-y-5">
      {/* Selectable target list — an iOS grouped list (row + checkmark), not a
          segmented tab strip; ends with an "Add SSH target" action row. */}
      <SettingsSection icon={<Server />} title="Server target">
        {targets.map((target) => (
          <button
            key={target.id}
            type="button"
            onClick={() => selectTarget(target.id)}
            disabled={IS_DEMO}
            aria-pressed={activeId === target.id}
            className={cn(
              "relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/60 disabled:opacity-60",
              "after:absolute after:inset-x-0 after:bottom-0 after:left-4 after:h-px after:bg-border/60 last:after:hidden",
            )}
          >
            <span className="shrink-0 text-muted-foreground">{targetIcon(target)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-foreground">{target.label}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{targetSubtitle(target)}</span>
            </span>
            {activeId === target.id && <Check className="size-4 shrink-0 text-info" />}
          </button>
        ))}
        <SettingsActionRow label="Add SSH target" icon={<Plus />} onClick={onAddSsh} disabled={IS_DEMO} />
      </SettingsSection>

      {/* Active target config — value + editable rows directly in the card (no
          nested filled card), a friendly kind, then Test as an action row. */}
      {active && (
        <SettingsSection
          icon={targetIcon(active)}
          title={active.label}
          footnote="SSH targets intentionally store only public connection metadata (user, host, port); use Tailscale SSH or server-side keys on the VPS, never browser-stored passwords/private keys. SSH targets are config-ready; host actions stay on mock/local until a server-side SSH bridge is enabled."
        >
          <SettingsValueRow label="Kind" value={kindLabel(active)} />

          {active.kind === "local" && (
            <SettingsRow label="Server URL">
              <Input
                value={active.url}
                onChange={(e) => patchTarget(active.id, { url: e.target.value })}
                placeholder="Current origin / https://vps.example.com"
                disabled={IS_DEMO}
                className="sm:w-64"
              />
            </SettingsRow>
          )}

          {isSsh(active) && (
            <>
              <SettingsRow label="Label">
                <Input value={active.label} onChange={(e) => patchTarget(active.id, { label: e.target.value })} placeholder="Laptop" disabled={IS_DEMO} className="sm:w-64" />
              </SettingsRow>
              <SettingsRow label="SSH user">
                <Input value={active.user} onChange={(e) => patchTarget(active.id, { user: e.target.value })} placeholder="ubuntu" disabled={IS_DEMO} className="sm:w-64" />
              </SettingsRow>
              <SettingsRow label="Tailscale host">
                <Input value={active.host} onChange={(e) => patchTarget(active.id, { host: e.target.value })} placeholder="laptop.example-tailnet" disabled={IS_DEMO} className="sm:w-64" />
              </SettingsRow>
              <SettingsRow label="Port">
                <Input value={String(active.port)} onChange={(e) => patchTarget(active.id, { port: Number(e.target.value) || 22 })} inputMode="numeric" disabled={IS_DEMO} className="sm:w-24" />
              </SettingsRow>
            </>
          )}

          {test && (
            <SettingsRow label="Last test">
              <StatusChip test={test} />
            </SettingsRow>
          )}
          <SettingsActionRow
            label="Test connection"
            onClick={onTest}
            busy={test?.state === "testing"}
            disabled={IS_DEMO || test?.state === "testing" || active.kind === "ssh"}
          />
        </SettingsSection>
      )}
    </div>
  );
}
