"use client";

import { useMemo, type ReactNode } from "react";
import { HostApiProvider } from "@/features/appshell";
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

// os-vps adapter injection: pick mock (default) ↔ live, then hand the concrete
// api to the framework's HostApiProvider (which owns the context useOsApi reads).
// Live talks to SAME-ORIGIN `/api/v1` route handlers (base url ""); the signed
// session cookie rides along, the routes verify it, then proxy to the host agent
// with the gateway secret (server-side only). Demo never touches the host.
export function OsApiProvider({ children }: { children: ReactNode }) {
  const { tweaks } = useAppearance();
  const mode = IS_DEMO ? "mock" : tweaks.server.mode;
  const api = useMemo(
    () => (mode === "live" ? HttpAdapter({ url: "" }) : MockAdapter()),
    [mode],
  );
  return <HostApiProvider api={api}>{children}</HostApiProvider>;
}

// The port hook + types live in the framework now; re-export so existing
// `@/lib/os-api` importers keep resolving during the migration to the barrel.
export { useOsApi } from "@/features/appshell";
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
