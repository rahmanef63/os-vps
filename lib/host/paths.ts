// SERVER-ONLY. Path resolution + bounds for host filesystem access. os-vps runs
// as a host process, so /api/v1 talks to the FS directly (no agent). READ and
// WRITE roots are separate: reads can be wide (browse), writes are narrow so the
// web OS can't clobber system files. Symlinks are realpath-resolved BEFORE the
// bounds check so a link can't escape a root. Configure with OS_FS_READ_ROOTS /
// OS_FS_WRITE_ROOTS (colon-separated; "~" = home, "/" = whole filesystem).
import { promises as fs, realpathSync } from "fs";
import os from "os";
import path from "path";
import type { FsRoot } from "@/lib/os-api/types";
import { HostError } from "./host-error";

export function homeDir(): string {
  return os.homedir();
}

function expandHome(p: string): string {
  if (p === "~") return homeDir();
  if (p.startsWith("~/")) return path.join(homeDir(), p.slice(2));
  return p;
}

function rootsFromEnv(name: string, fallback: string[]): string[] {
  const env = process.env[name];
  if (env && env.trim())
    return env.split(":").map((s) => s.trim()).filter(Boolean).map(expandHome);
  return fallback;
}

export function readRootList(): string[] {
  const h = homeDir();
  return rootsFromEnv("OS_FS_READ_ROOTS", [h, path.join(h, "projects")]);
}

export function writeRootList(): string[] {
  const h = homeDir();
  return rootsFromEnv("OS_FS_WRITE_ROOTS", [h, path.join(h, "projects")]);
}

export function isUnderRoot(target: string, root: string): boolean {
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

// Credential denylist: even inside a legal root, the app's OWN secret files are
// off-limits to the FS API. Reading .env.local would leak OS_SESSION_SECRET —
// turning one stolen session into the ability to mint cookies forever — and
// ~/.os-vps holds the device allowlist, BYOK key and browser profile (cookies).
// Other projects' .env files stay readable (session = owner, their call).
const APP_DIR = (() => {
  try {
    return realpathSync(process.cwd());
  } catch {
    return process.cwd();
  }
})();

// Defense-in-depth: high-value credential material in $HOME is blocked even
// though the session belongs to the owner — a hijacked session shouldn't walk
// away with SSH keys or shell history. Override with OS_FS_ALLOW_SENSITIVE=1
// (or narrow the roots entirely via OS_FS_READ_ROOTS).
const SENSITIVE_HOME = [
  ".ssh", ".gnupg", ".secrets", ".npmrc", "vault",
  // shell + REPL history (the host shell may be zsh/fish, not just bash)
  ".bash_history", ".zsh_history", ".python_history", ".mysql_history",
  // cloud / infra credentials
  ".aws", ".config/gcloud", ".kube", ".docker", ".config/rclone",
  ".git-credentials", ".netrc", ".config/git/credentials",
  // database creds + password-manager CLIs
  ".pgpass", ".config/op", ".config/lpass",
  // loose private keys saved outside ~/.ssh (heredoc dumps, exports, etc.)
  "id_rsa", "id_ed25519", "id_ecdsa", "id_dsa",
];

export function isSensitivePath(real: string): boolean {
  if (process.env.OS_FS_ALLOW_SENSITIVE === "1") return false;
  const h = homeDir();
  return SENSITIVE_HOME.some((n) => {
    const p = path.join(h, n);
    return real === p || isUnderRoot(real, p);
  });
}

function isCredentialPath(real: string): boolean {
  const store = path.join(homeDir(), ".os-vps");
  if (real === store || isUnderRoot(real, store)) return true;
  if (isSensitivePath(real)) return true;
  const base = path.basename(real);
  return path.dirname(real) === APP_DIR && base.startsWith(".env") && base !== ".env.example";
}

function assertNotCredential(real: string): void {
  if (isCredentialPath(real)) throw new HostError("Access to credential/sensitive files is blocked");
}

async function realRoots(list: string[]): Promise<string[]> {
  return Promise.all(
    list.map(async (r) => {
      try {
        return await fs.realpath(r);
      } catch {
        return path.resolve(r);
      }
    }),
  );
}

// Realpath-resolved WRITE roots — shared by safeWritePath/assertNotRoot here and
// exec.ts's cwd bounds, so the realpath-fallback strategy lives in one place.
export async function resolveWriteRoots(): Promise<string[]> {
  return realRoots(writeRootList());
}

// READ: "/" is the filesystem root (browse-anywhere if a read root allows it);
// "~"/"" = home. Resolves symlinks, then asserts inside a read root.
export async function resolveReadable(requested: string): Promise<string> {
  const h = homeDir();
  let absolute: string;
  if (!requested || requested === "~") absolute = h;
  else if (requested.startsWith("~/")) absolute = path.join(h, requested.slice(2));
  else absolute = path.resolve(requested);
  const real = await fs.realpath(path.resolve(absolute));
  const rr = await realRoots(readRootList());
  if (!rr.some((r) => isUnderRoot(real, r))) throw new HostError("Path outside readable roots");
  assertNotCredential(real);
  return real;
}

// WRITE: "/" collapses to home (never the FS root). When !mustExist the parent
// is checked (target doesn't exist yet). Asserts inside a write root.
export async function safeWritePath(requested: string, mustExist: boolean): Promise<string> {
  const h = homeDir();
  let absolute: string;
  if (!requested || requested === "~" || requested === "/") absolute = h;
  else if (requested.startsWith("~/")) absolute = path.join(h, requested.slice(2));
  else absolute = path.resolve(requested);
  const rr = await realRoots(writeRootList());
  if (mustExist) {
    const real = await fs.realpath(absolute);
    if (!rr.some((r) => isUnderRoot(real, r))) throw new HostError("Path outside writable roots");
    assertNotCredential(real);
    return real;
  }
  const parent = await fs.realpath(path.dirname(absolute));
  if (!rr.some((r) => isUnderRoot(parent, r))) throw new HostError("Path outside writable roots");
  const joined = path.join(parent, path.basename(absolute));
  assertNotCredential(joined);
  return joined;
}

export async function assertNotRoot(p: string): Promise<void> {
  const rr = await realRoots(writeRootList());
  if (rr.some((r) => r === p)) throw new HostError("Refusing to modify a root directory");
}

function labelFor(p: string): string {
  const h = homeDir();
  if (p === "/") return "Filesystem";
  if (p === h) return "Home";
  if (p === path.join(h, "projects")) return "Projects";
  return path.basename(p) || p;
}

// Sidebar jump-points: Home + Projects, plus any extra read roots (e.g. "/").
export function resolveRoots(): FsRoot[] {
  const h = homeDir();
  const base: FsRoot[] = [
    { label: "Home", path: h },
    { label: "Projects", path: path.join(h, "projects") },
  ];
  const extra = readRootList()
    .filter((p) => p !== h && p !== path.join(h, "projects"))
    .map((p) => ({ label: labelFor(p), path: p }));
  return [...base, ...extra];
}
