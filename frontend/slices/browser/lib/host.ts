"use client";

// os-vps side of the slice's host seam: the BrowserAdapter is the HTTP client
// for /api/v1/browser/*. Every call carries a `tab` consumer id so each UI tab
// drives its own runtime page (multitab). Session-cookie auth, same-origin.

export type { AppDescriptor } from "@/features/os-shell";
export { usePublishInspector } from "@/features/os-shell";

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
  close: (tab: string) => Promise<void>;
  agentLog: () => Promise<AgentLogEntry[]>;
};

const api: BrowserAdapter = {
  state: async (tab) => {
    const r = await fetch(`/api/v1/browser/state?tab=${encodeURIComponent(tab)}`);
    if (!r.ok) throw new Error(`http_${r.status}`);
    return (await r.json()) as RemoteState;
  },
  screenshot: async (tab) => {
    const r = await fetch(`/api/v1/browser/screenshot?type=jpeg&q=55&tab=${encodeURIComponent(tab)}`);
    if (!r.ok) return null;
    return await r.blob();
  },
  act: async (path, body, tab) => {
    const r = await fetch(`/api/v1/browser/${path}?tab=${encodeURIComponent(tab)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return (await r.json().catch(() => ({}))) as Partial<RemoteState>;
  },
  close: async (tab) => {
    await fetch(`/api/v1/browser/close?tab=${encodeURIComponent(tab)}`, { method: "POST" }).catch(() => {});
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
