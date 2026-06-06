"use client";

// os-vps side of the slice's host seam: the shell inspector re-exports from
// os-shell, and the BrowserAdapter is the HTTP client for /api/v1/browser/*
// (session-cookie auth, same-origin). The rr catalog copy replaces this
// file with a self-contained version (offline canvas demo renderer) —
// every other file is line-identical.

export type { AppDescriptor } from "@/features/os-shell";
export { usePublishInspector } from "@/features/os-shell";

export type RemoteState = { url: string; title: string };
/** Action paths the UI sends: navigate/click/type/key/scroll/back/forward/reload. */
export type BrowserAdapter = {
  state: () => Promise<RemoteState>;
  screenshot: () => Promise<Blob | null>;
  act: (path: string, body?: unknown) => Promise<Partial<RemoteState>>;
};

// Stable identity — hooks keep this in effect deps.
const api: BrowserAdapter = {
  state: async () => {
    const r = await fetch("/api/v1/browser/state");
    if (!r.ok) throw new Error(`http_${r.status}`);
    return (await r.json()) as RemoteState;
  },
  screenshot: async () => {
    const r = await fetch("/api/v1/browser/screenshot");
    if (!r.ok) return null;
    return await r.blob();
  },
  act: async (path, body) => {
    const r = await fetch(`/api/v1/browser/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return (await r.json().catch(() => ({}))) as Partial<RemoteState>;
  },
};

export function useBrowserApi(): BrowserAdapter {
  return api;
}
