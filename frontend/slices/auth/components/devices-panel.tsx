"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ShieldCheck, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormDrawer } from "@/features/os-shell";
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
  // Revoke is destructive (other browsers lose sign-in); confirm before firing.
  const [pendingRevoke, setPendingRevoke] = useState<Device | null>(null);
  const thisId = typeof window !== "undefined" ? getOrCreateDeviceId() : "";

  // Pure fetch (no setState) so the mount effect can use the .then form
  // (react-hooks/set-state-in-effect).
  const fetchDevices = useCallback(async (): Promise<Device[]> => {
    try {
      const r = await fetch("/api/auth/devices", { cache: "no-store" });
      if (r.ok) return flatten((await r.json()) as DevicesResponse);
      return [];
    } catch {
      return [];
    }
  }, []);

  const load = useCallback(async () => {
    setDevices(await fetchDevices());
  }, [fetchDevices]);

  useEffect(() => {
    let alive = true;
    fetchDevices().then((d) => alive && setDevices(d));
    return () => {
      alive = false;
    };
  }, [fetchDevices]);

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
    <>
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
            {/* Masked — a full ID on screen is a shoulder-surf/screenshot leak.
                Click copies the full ID for CLI approval flows. */}
            <Button
              variant="ghost"
              size="sm"
              className="block h-auto truncate p-0 text-left font-mono text-[11px] font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
              title="Copy full device ID"
              onClick={() => void navigator.clipboard.writeText(d.deviceId)}
            >
              …{d.deviceId.slice(-6)}
            </Button>
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
              onClick={() => setPendingRevoke(d)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          )}
        </li>
      ))}
    </ul>

      <FormDrawer
        open={pendingRevoke !== null}
        onOpenChange={(open) => !open && setPendingRevoke(null)}
        size="sm"
      >
        <FormDrawer.Header>
          <FormDrawer.Title>
            {pendingRevoke ? `Revoke device "${pendingRevoke.label}"?` : "Revoke device?"}
          </FormDrawer.Title>
          <FormDrawer.Description>
            This device will need re-approval to sign in again. Existing sessions stay valid until they expire.
          </FormDrawer.Description>
        </FormDrawer.Header>
        <FormDrawer.Footer>
          <Button type="button" variant="ghost" onClick={() => setPendingRevoke(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              if (pendingRevoke) void act("revoke", pendingRevoke.deviceId);
              setPendingRevoke(null);
            }}
          >
            <Trash2 className="size-4" />
            Revoke
          </Button>
        </FormDrawer.Footer>
      </FormDrawer>
    </>
  );
}
