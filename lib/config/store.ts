import { promises as fs } from "fs";
import os from "os";
import path from "path";

// Owner config (BYOK Anthropic key + model), replacing the Convex `appConfig`
// table. A host JSON file (chmod 600) read server-side only — the raw key never
// reaches the browser. Same self-contained model as the Control Room.

export interface OsConfig {
  anthropicApiKey?: string;
  model?: string;
}

const CONFIG_PATH =
  process.env.OS_CONFIG_STORE ?? path.join(os.homedir(), ".os-vps", "config.json");

export const DEFAULT_MODEL = "claude-opus-4-8";

export async function readConfig(): Promise<OsConfig> {
  try {
    return JSON.parse(await fs.readFile(CONFIG_PATH, "utf8")) as OsConfig;
  } catch {
    return {};
  }
}

export async function writeConfig(patch: OsConfig): Promise<void> {
  const current = await readConfig();
  const next: OsConfig = { ...current, ...patch };
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  const tmp = `${CONFIG_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), { encoding: "utf8", mode: 0o600 });
  await fs.rename(tmp, CONFIG_PATH);
}

// Resolve the API key: stored BYOK key wins, else the ANTHROPIC_API_KEY env.
export async function resolveApiKey(): Promise<string> {
  const cfg = await readConfig();
  return cfg.anthropicApiKey || process.env.ANTHROPIC_API_KEY || "";
}

export async function resolveModel(): Promise<string> {
  return (await readConfig()).model || DEFAULT_MODEL;
}
