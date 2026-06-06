"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAppearance } from "@/lib/appearance";
import { IS_DEMO } from "@/lib/demo";
import { MockAdapter } from "./mock-adapter";
import { HttpAdapter } from "./http-adapter";
import type { OsApi, OsApiConfig } from "./types";

export function makeApi(cfg: OsApiConfig): OsApi {
  return cfg.mode === "live" ? HttpAdapter(cfg) : MockAdapter();
}

// Same-origin URL for raw file bytes (image/video/audio/pdf). Demo media lives
// in /demo-media/* as static public assets (served with no host/auth — works in
// the demo). Everything else streams from the host via the cookie-authed raw
// route (works as an <img>/<video>/<audio> src directly, no token plumbing).
export function rawUrl(path: string): string {
  if (path.startsWith("/demo-media/")) return path;
  return "/api/v1/fs/raw?path=" + encodeURIComponent(path);
}

const OsApiContext = createContext<OsApi | null>(null);

// mock (default) ↔ live. Live talks to SAME-ORIGIN `/api/v1` route handlers
// (base url ""); the signed session cookie rides along automatically, the route
// handlers verify it, then proxy to the host agent with the gateway secret
// (server-side only). The agent URL/secret are env, never in the client.
export function OsApiProvider({ children }: { children: ReactNode }) {
  const { tweaks } = useAppearance();
  // Demo never touches the host — force mock regardless of the saved setting.
  const mode = IS_DEMO ? "mock" : tweaks.server.mode;
  const api = useMemo(
    () => (mode === "live" ? HttpAdapter({ url: "" }) : MockAdapter()),
    [mode],
  );
  return <OsApiContext.Provider value={api}>{children}</OsApiContext.Provider>;
}

export function useOsApi(): OsApi {
  const api = useContext(OsApiContext);
  if (!api) throw new Error("useOsApi must be used within OsApiProvider");
  return api;
}

export type {
  OsApi,
  SysStats,
  FsEntry,
  FsList,
  FsRoot,
  FsUsage,
  FsHit,
  UploadFile,
  UploadResult,
  ExecResult,
  Process,
} from "./types";
