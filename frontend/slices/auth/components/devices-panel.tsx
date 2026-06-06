"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ShieldCheck, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getOrCreateDeviceId } from "../lib/device";

type Device = { deviceId: string; label: string; status: "approved" | "pending" };
type DevicesResponse = {
  approved?: Record<string, { label?: string }>;
  pending?: Record<string, { label?: string }>;
};

// Flatten the {approved,pending} maps from /api/auth/devices into one list.
function flatten(r: DevicesResponse): Device[] {
  const a = Object.entries(r.approved ?? {}).map(
    ([deviceId, d]): Device => ({ deviceId, label: d.label || "device", status: "approved" }),
  );
  const p = Object.entries(r.pending ?? {}).map(
    ([deviceId, d]): Device => ({ deviceId, label: d.label || "device", status: "pending" }),
  );
  return [...a, ...p];
}

// Settings → Devices. Only reachable from an approved device (the OS is gated),
// so listing + approving the fleet here is the self-service path after the
// bootstrap device. Backed by the host JSON store via /api/auth/devices.
export function DevicesPanel() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const thisId = typeof window !== "undefined" ? getOrCreateDeviceId() : "";

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/devices", { cache: "no-store" });
      if (r.ok) setDevices(flatten((await r.json()) as DevicesResponse));
      else setDevices([]);
    } catch {
      setDevices([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = useCallback(async (action: "approve" | "revoke", deviceId: string) => {
    try {
      const r = await fetch("/api/auth/devices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, deviceId }),
      });
      if (r.ok) setDevices(flatten((await r.json()) as DevicesResponse));
    } catch {
      /* keep current list; user can retry */
    }
  }, []);

  if (devices === null) {
    return <p className="text-xs text-muted-foreground">Loading devices…</p>;
  }
  if (devices.length === 0) {
    return <p className="text-xs text-muted-foreground">No devices registered.</p>;
  }

  return (
    <ul className="space-y-2">
      {devices.map((d) => (
        <li
          key={d.deviceId}
          className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-2.5"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-secondary text-muted-foreground">
            {d.status === "approved" ? <ShieldCheck className="size-4" /> : <Clock className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 truncate text-sm font-medium">
              {d.label}
              {d.deviceId === thisId && <Badge variant="outline">This device</Badge>}
            </p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">{d.deviceId}</p>
          </div>
          {d.status === "pending" ? (
            <Button size="sm" onClick={() => void act("approve", d.deviceId)}>
              <Check className="size-3.5" /> Approve
            </Button>
          ) : (
            <Badge>approved</Badge>
          )}
          {d.deviceId !== thisId && (
            <Button
              size="icon"
              variant="ghost"
              aria-label="Revoke device"
              onClick={() => void act("revoke", d.deviceId)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
