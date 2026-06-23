import { TWEAK_DEFAULTS, type ServerConfig, type ServerTarget, type SshServerTarget } from "./types";

type NormalizedServerConfig = ServerConfig & { targets: ServerTarget[] };

const CORE_TARGETS: ServerTarget[] = TWEAK_DEFAULTS.server.targets ?? [];

function normalizeTarget(target: ServerTarget): ServerTarget {
  if (target.kind === "local") return { ...target, url: target.url ?? "" };
  if (target.kind === "ssh") {
    return {
      ...target,
      host: target.host ?? "",
      user: target.user ?? "",
      port: Number.isFinite(target.port) && target.port > 0 ? target.port : 22,
    };
  }
  return target;
}

function uniqueTargets(targets: ServerTarget[]): ServerTarget[] {
  const out: ServerTarget[] = [];
  const seen = new Set<string>();
  for (const target of targets) {
    if (seen.has(target.id)) continue;
    seen.add(target.id);
    out.push(normalizeTarget(target));
  }
  return out;
}

export function ensureServerTargets(server: ServerConfig): NormalizedServerConfig {
  const legacyActive = server.mode === "live" ? "vps" : "mock";
  const existing = server.targets?.map(normalizeTarget) ?? [];
  // Saved/edited targets win (first-wins dedupe). Only APPEND core targets whose
  // id is missing, so a user's host/user/port edits survive ensureServerTargets.
  const have = new Set(existing.map((target) => target.id));
  const missingCore = CORE_TARGETS.filter((target) => !have.has(target.id)).map((target) =>
    target.id === "vps" && target.kind === "local" ? { ...target, url: server.url ?? "" } : target,
  );
  const targets = uniqueTargets([...existing, ...missingCore]);
  const activeTargetId = server.activeTargetId ?? legacyActive;
  return {
    ...server,
    url: server.url ?? "",
    targets,
    activeTargetId: targets.some((target) => target.id === activeTargetId) ? activeTargetId : "mock",
  };
}

export function effectiveServerTarget(server: ServerConfig, demo = false): ServerTarget | null {
  const normalized = ensureServerTargets(server);
  if (demo) return normalized.targets.find((target) => target.id === "mock") ?? null;
  return (
    normalized.targets.find((target) => target.id === normalized.activeTargetId) ??
    normalized.targets.find((target) => target.id === "mock") ??
    null
  );
}

function serverModeForTarget(target: ServerTarget | null): ServerConfig["mode"] {
  return target?.kind === "local" ? "live" : "mock";
}

function nextSshTargetId(targets: ServerTarget[]): string {
  let n = 2;
  let id = "ssh-2";
  const ids = new Set(targets.map((target) => target.id));
  while (ids.has(id)) {
    n += 1;
    id = `ssh-${n}`;
  }
  return id;
}

export function addSshTarget(server: ServerConfig): NormalizedServerConfig {
  const normalized = ensureServerTargets(server);
  const id = nextSshTargetId(normalized.targets);
  const target: SshServerTarget = { id, kind: "ssh", label: "SSH Host", host: "", user: "", port: 22 };
  return {
    ...normalized,
    activeTargetId: id,
    mode: "mock",
    targets: [...normalized.targets, target],
  };
}

export function updateServerTarget(server: ServerConfig, id: string, patch: Partial<ServerTarget>): NormalizedServerConfig {
  const normalized = ensureServerTargets(server);
  const targets = normalized.targets.map((target) =>
    target.id === id ? normalizeTarget({ ...target, ...patch } as ServerTarget) : target,
  );
  const selected = targets.find((target) => target.id === normalized.activeTargetId) ?? null;
  const vps = targets.find((target): target is Extract<ServerTarget, { kind: "local" }> => target.id === "vps" && target.kind === "local");
  return {
    ...normalized,
    targets,
    url: vps?.url ?? normalized.url,
    mode: serverModeForTarget(selected),
  };
}

export function selectServerTarget(server: ServerConfig, id: string): NormalizedServerConfig {
  const normalized = ensureServerTargets(server);
  const selected = normalized.targets.find((target) => target.id === id) ?? null;
  return {
    ...normalized,
    activeTargetId: selected?.id ?? "mock",
    mode: serverModeForTarget(selected),
  };
}
