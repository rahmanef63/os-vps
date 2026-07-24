import "server-only";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { getManagedAppDefinition, listManagedAppDefinitions } from "./catalog";
import { commandExists, requireProgram, runProgram } from "./runner";
import type { ManagedAppAction, ManagedAppDefinition, ManagedAppId, ManagedAppLogs, ManagedAppView } from "./types";

interface Installation {
  type: "systemd" | "docker" | "package" | "not-installed";
  serviceName?: string;
  containerName?: string;
}

const active = new Map<ManagedAppId, ManagedAppAction>();
const SECRET = /\b(api[_-]?key|token|secret|password|authorization)\b\s*[:=]\s*([^\s,;]+)/gi;

function redact(line: string): string {
  return line.replace(/\bbearer\s+[^\s,;]+/gi, "Bearer [redacted]").replace(SECRET, "$1=[redacted]").slice(0, 8192);
}

async function systemdState(service: string): Promise<"active" | "inactive" | "missing"> {
  for (const args of [["--user", "is-active", service], ["is-active", service]]) {
    const result = await runProgram("systemctl", args, 10_000);
    if (result.code === 0 && result.stdout.trim() === "active") return "active";
    if (/could not be found|not-found|not loaded/i.test(`${result.stdout}\n${result.stderr}`)) continue;
    return "inactive";
  }
  return "missing";
}

async function detect(definition: ManagedAppDefinition): Promise<Installation> {
  for (const serviceName of definition.serviceNames) {
    if (await systemdState(serviceName) !== "missing") return { type: "systemd", serviceName };
  }
  if (await commandExists("docker")) {
    const result = await runProgram("docker", ["ps", "-a", "--format", "{{.Names}}"], 10_000);
    const names = new Set(result.stdout.split(/\r?\n/).map((name) => name.trim()));
    const containerName = definition.containerNames.find((name) => names.has(name));
    if (containerName) return { type: "docker", containerName };
  }
  if (await commandExists(definition.command)) return { type: "package" };
  return { type: "not-installed" };
}

async function running(installation: Installation): Promise<boolean> {
  if (installation.type === "systemd" && installation.serviceName) return (await systemdState(installation.serviceName)) === "active";
  if (installation.type === "docker" && installation.containerName) {
    const result = await runProgram("docker", ["inspect", "--format", "{{.State.Running}}", installation.containerName], 10_000);
    return result.code === 0 && result.stdout.trim() === "true";
  }
  return false;
}

async function health(definition: ManagedAppDefinition): Promise<boolean | null> {
  try {
    const response = await fetch(`${definition.dashboardUrl.replace(/\/$/, "")}/health`, { cache: "no-store", signal: AbortSignal.timeout(4_000) });
    return response.ok;
  } catch {
    return null;
  }
}

async function version(definition: ManagedAppDefinition): Promise<string | null> {
  if (!(await commandExists(definition.command))) return null;
  const result = await runProgram(definition.command, ["--version"], 10_000);
  return result.code === 0 ? result.stdout.trim().split(/\r?\n/)[0]?.slice(0, 160) || null : null;
}

function actionsFor(installation: Installation): ManagedAppAction[] {
  if (installation.type === "systemd" || installation.type === "docker") return ["start", "stop", "restart", "backup"];
  if (installation.type === "package") return ["backup"];
  return [];
}

export async function getManagedApp(id: ManagedAppId): Promise<ManagedAppView> {
  const definition = getManagedAppDefinition(id);
  const installation = await detect(definition);
  const isRunning = await running(installation);
  const isHealthy = isRunning ? await health(definition) : null;
  const operation = active.get(id);
  const state = operation === "start"
    ? "starting"
    : installation.type === "not-installed"
      ? "not-installed"
      : isHealthy === false
        ? "unhealthy"
        : isRunning
          ? "running"
          : "stopped";
  return {
    id,
    name: definition.name,
    description: definition.description,
    installed: installation.type !== "not-installed",
    installationType: installation.type,
    state,
    healthy: isHealthy,
    version: await version(definition),
    dashboardAvailable: isRunning && isHealthy !== false,
    supportedActions: actionsFor(installation),
  };
}

export async function listManagedApps(): Promise<ManagedAppView[]> {
  const views: ManagedAppView[] = [];
  for (const definition of listManagedAppDefinitions()) views.push(await getManagedApp(definition.id));
  return views;
}

async function runLifecycle(installation: Installation, action: "start" | "stop" | "restart"): Promise<void> {
  if (installation.type === "systemd" && installation.serviceName) {
    for (const args of [["--user", action, installation.serviceName], [action, installation.serviceName]]) {
      const result = await runProgram("systemctl", args, 30_000);
      if (result.code === 0) return;
    }
  }
  if (installation.type === "docker" && installation.containerName) {
    await requireProgram("docker", [action, installation.containerName], 30_000);
    return;
  }
  throw new Error("operation unsupported for detected installation type");
}

async function assertNoSymlinks(root: string): Promise<void> {
  const stat = await fs.lstat(root);
  if (stat.isSymbolicLink()) throw new Error("backup path contains a symbolic link");
  if (!stat.isDirectory()) return;
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error("backup path contains a symbolic link");
    if (entry.isDirectory()) await assertNoSymlinks(path.join(root, entry.name));
  }
}

async function backup(definition: ManagedAppDefinition): Promise<void> {
  const source = path.join(os.homedir(), definition.stateDirName);
  await assertNoSymlinks(source);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = path.join(os.homedir(), ".os-vps", "backups", definition.id, stamp);
  await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  await fs.cp(source, target, { recursive: true, preserveTimestamps: true });
  await fs.writeFile(path.join(target, "manifest.json"), JSON.stringify({ applicationId: definition.id, createdAt: new Date().toISOString() }), { mode: 0o600 });
}

export async function performManagedAppAction(id: ManagedAppId, action: ManagedAppAction): Promise<ManagedAppView> {
  if (active.has(id)) throw new Error("another operation is already running");
  const definition = getManagedAppDefinition(id);
  const installation = await detect(definition);
  if (!actionsFor(installation).includes(action)) throw new Error("operation unsupported for detected installation type");
  active.set(id, action);
  try {
    if (action === "backup") await backup(definition);
    else await runLifecycle(installation, action);
  } finally {
    active.delete(id);
  }
  return getManagedApp(id);
}

export async function getManagedAppLogs(id: ManagedAppId): Promise<ManagedAppLogs> {
  const definition = getManagedAppDefinition(id);
  const installation = await detect(definition);
  let result = null;
  if (installation.type === "systemd" && installation.serviceName) {
    result = await runProgram("journalctl", ["--user", "-u", installation.serviceName, "-n", "100", "--no-pager", "-o", "short-iso"], 15_000);
    if (result.code !== 0) result = await runProgram("journalctl", ["-u", installation.serviceName, "-n", "100", "--no-pager", "-o", "short-iso"], 15_000);
  } else if (installation.type === "docker" && installation.containerName) {
    result = await runProgram("docker", ["logs", "--tail", "100", installation.containerName], 15_000);
  }
  if (!result || result.code !== 0) return { available: false, entries: [] };
  return { available: true, entries: `${result.stdout}\n${result.stderr}`.split(/\r?\n/).filter(Boolean).slice(-100).map(redact) };
}
