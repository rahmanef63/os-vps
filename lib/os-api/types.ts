// os-rr Cloud API contract — the single boundary between the OS and the VPS.
// MockAdapter simulates in-browser; HttpAdapter calls the Control Room agent.
export const API_VERSION = "v1";

export type Unsub = () => void;

export type SysStats = {
  cpu: { pct: number; cores: number };
  mem: { used: number; total: number };
  disk: { used: number; total: number };
  net?: { rx: number; tx: number };
  uptime: number;
};

export type FsEntry = {
  name: string;
  kind: "dir" | "file";
  size: number;
  ext?: string;
  mime?: string;
};
export type FsRoot = { label: string; path: string };
export type FsList = {
  /** Canonical absolute path the host resolved (e.g. "/" → "/home/rahman"). */
  path: string;
  entries: FsEntry[];
  /** Jump-point roots (Home, Projects, Filesystem…) for the sidebar. */
  roots?: FsRoot[];
  /** Parent dir within bounds, or null at a root. */
  parent?: string | null;
};
export type FsUsage = { used: number; total: number };

/** A search hit — a folder (or file) matched by name under a search root. */
export type FsHit = { name: string; path: string; kind: "dir" | "file" };

/** One upload item. `relPath` keeps folder structure (e.g. "imgs/a.png"); for a
 * loose file it's just the name. `file` carries the raw bytes. */
export type UploadFile = { relPath: string; file: File };
/** Per-request upload outcome: how many landed, and which relPaths were skipped. */
export type UploadResult = { written: number; failed?: string[] };

/** One-shot command result: full stdout/stderr + exit code (no streaming/pty). */
export type ExecResult = { stdout: string; stderr: string; code: number };

export type Process = {
  pid: number;
  name: string;
  status: string;
  cpu: number;
  mem: number;
};

export type AppManifest = { name: string; slug: string; runtime: string; entry: string };

export type OsApi = {
  mode: "mock" | "live";
  auth: {
    token: (u: string, p: string) => Promise<{ token: string; expires_at: number }>;
    me: () => Promise<{ user: { name: string; id: string } }>;
  };
  fs: {
    list: (path: string) => Promise<FsList>;
    read: (path: string) => Promise<string>;
    write: (path: string, content: string) => Promise<{ ok: boolean }>;
    mkdir: (path: string) => Promise<{ kind: "dir" }>;
    remove: (path: string) => Promise<{ ok: boolean }>;
    /** Move/rename: `to` is the full destination path (rename == move within dir). */
    move: (from: string, to: string) => Promise<{ ok: boolean }>;
    /** Recursive copy of a file or dir to a full destination path. */
    copy: (from: string, to: string) => Promise<{ ok: boolean }>;
    /** Binary-safe upload of files (and folders, via relPath) into `dest`. */
    upload: (dest: string, files: UploadFile[]) => Promise<UploadResult>;
    /** Find folders by name under a root (default ~/projects). Read-only. */
    search: (query: string) => Promise<FsHit[]>;
    usage: () => Promise<FsUsage>;
  };
  exec: {
    /** Run a shell command on the host (cwd defaults to home). One-shot, captured output. */
    run: (cmd: string, cwd?: string) => Promise<ExecResult>;
  };
  sys: {
    stats: () => Promise<SysStats>;
    statsStream: (onEvent: (s: Partial<SysStats>) => void) => Unsub;
    processes: () => Promise<Process[]>;
  };
  apps: {
    list: () => Promise<AppManifest[]>;
    start: (slug: string) => Promise<{ slug: string; state: string }>;
    stop: (slug: string) => Promise<{ ok: boolean }>;
  };
};

export type OsApiConfig = { mode: "mock" | "live"; url?: string; token?: string };
