// os-rr Cloud API contract — the single boundary between the OS and the VPS.
// The OsApi PORT + host data types now live in the appshell framework
// (appshell/lib/host-api) so app slices import them via a legal alias; this
// module keeps the os-vps CONFIG + the concrete adapters (http/mock) that
// satisfy the port. MockAdapter simulates in-browser; HttpAdapter calls the agent.
export const API_VERSION = "v1";

export type {
  Unsub,
  SysStats,
  FsEntry,
  FsRoot,
  FsList,
  FsUsage,
  FsHit,
  UploadFile,
  UploadResult,
  UploadProgress,
  ExecResult,
  Process,
  AppManifest,
  OsApi,
} from "@/features/appshell";

export type OsApiConfig = { mode: "mock" | "live"; url?: string; token?: string };
