"use client";

// os-vps side of the slice's host seam: the BrowserAdapter is the HTTP client
// for /api/v1/browser/*. Every call carries a `tab` consumer id so each UI tab
// drives its own runtime page (multitab). Session-cookie auth, same-origin.

import { useAppearance } from "@/lib/appearance";
import { IS_DEMO } from "@/lib/demo";

export type { AppDescriptor } from "@/features/os-shell";
export { usePublishInspector } from "@/features/os-shell";

// Mock vs live mirrors lib/os-api's selection: demo forces mock regardless of
// the saved setting; otherwise Settings → Server decides. There is no mock
// browser backend (it's a REAL headless Chromium on the host), so in mock mode
// the app must not poll the live endpoints at all.
export function useBrowserMode(): { live: boolean; demo: boolean } {
  const { tweaks } = useAppearance();
  return { live: !IS_DEMO && tweaks.server.mode === "live", demo: IS_DEMO };
}

export type RemoteState = { url: string; title: string };
export type AgentLogEntry = { ts?: string; action: string; actor?: string; target?: string };

/** The screencast MJPEG stream URL for a tab (read by the hook's stream reader). */
export function streamUrl(tab: string): string {
  return `/api/v1/browser/screencast?tab=${encodeURIComponent(tab)}`;
}

export type BrowserAdapter = {
  state: (tab: string) => Promise<RemoteState>;
  screenshot: (tab: string) => Promise<Blob | null>;
  act: (path: string, body: unknown, tab: string) => Promise<Partial<RemoteState>>;
  // keepalive: the close survives an unmount/page-unload (mirrors the PTY
  // dispose pattern) so window-close doesn't orphan the remote Chromium page.
  close: (tab: string, keepalive?: boolean) => Promise<void>;
  agentLog: () => Promise<AgentLogEntry[]>;
};

const api: BrowserAdapter = {
  state: async (tab) => {
    const r = await fetch(`/api/v1/browser/state?tab=${encodeURIComponent(tab)}`);
    if (!r.ok) throw new Error(`http_${r.status}`);
    return (await r.json()) as RemoteState;
  },
  // Throw on !r.ok (service offline / 5xx) instead of silently returning null —
  // the hook counts these to surface an "offline" state rather than spin forever.
  screenshot: async (tab) => {
    const r = await fetch(`/api/v1/browser/screenshot?type=jpeg&q=55&tab=${encodeURIComponent(tab)}`);
    if (!r.ok) throw new Error(`http_${r.status}`);
    return await r.blob();
  },
  // Throw on !r.ok so a dead/erroring service surfaces instead of being
  // swallowed into `{}` (which read as a successful no-op forever).
  act: async (path, body, tab) => {
    const r = await fetch(`/api/v1/browser/${path}?tab=${encodeURIComponent(tab)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`http_${r.status}`);
    return (await r.json().catch(() => ({}))) as Partial<RemoteState>;
  },
  close: async (tab, keepalive = false) => {
    await fetch(`/api/v1/browser/close?tab=${encodeURIComponent(tab)}`, {
      method: "POST",
      keepalive,
    }).catch(() => {});
  },
  agentLog: async () => {
    const r = await fetch("/api/v1/browser/agent-log", { cache: "no-store" });
    if (!r.ok) return [];
    return ((await r.json()) as { entries?: AgentLogEntry[] }).entries ?? [];
  },
};

export function useBrowserApi(): BrowserAdapter {
  return api;
}
