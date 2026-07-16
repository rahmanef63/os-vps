import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { envCredentialStore, PROVIDERS } from "@/lib/models";

// Owner config (BYOK keys + selected provider/model), replacing the Convex
// `appConfig` table. A host JSON file (chmod 600) read server-side only — raw keys
// never reach the browser. `keys` is the per-provider SSOT; `anthropicApiKey`
// stays a read-only alias so existing installs migrate for free.

/** A user-added OpenAI-compatible / Anthropic-Messages endpoint. The key stays in
 *  OsConfig.keys[slug] (same per-provider SSOT as built-ins); this holds the wiring. */
export interface CustomProviderConn {
  baseUrl: string;
  protocol?: "openai" | "anthropic";
  models?: string[];
}

export interface OsConfig {
  /** Per-provider BYOK keys — the SSOT. */
  keys?: Record<string, string>;
  /** Selected provider id (e.g. "anthropic"). */
  provider?: string;
  model?: string;
  /** User-added custom providers: slug → connection (key stays in keys[slug]). */
  customProviders?: Record<string, CustomProviderConn>;
  /** @deprecated back-compat read alias for keys.anthropic. */
  anthropicApiKey?: string;
}

const CONFIG_PATH =
  process.env.OS_CONFIG_STORE ?? path.join(os.homedir(), ".os-vps", "config.json");

export const DEFAULT_MODEL = "claude-opus-4-8";
export const DEFAULT_PROVIDER = "anthropic";

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

// The selected model as a "provider/model" ref for @rahmanef/models resolveModel().
export async function resolveModelRef(): Promise<string> {
  const c = await readConfig();
  return `${c.provider || DEFAULT_PROVIDER}/${c.model || DEFAULT_MODEL}`;
}

// A @rahmanef/models CredentialStore over the 0600 host config file, per-provider,
// with the env chain as fallback. Single-owner → tenantId ignored. The stored BYOK
// key wins; legacy anthropicApiKey is a read fallback; else env (ANTHROPIC_API_KEY…).
export function hostCredentialStore() {
  const env = envCredentialStore();
  return {
    async getKey(_tenant: string | undefined, provider: string) {
      const c = await readConfig();
      const fromFile = c.keys?.[provider] ?? (provider === "anthropic" ? c.anthropicApiKey : undefined);
      return fromFile || (await env.getKey(_tenant, provider));
    },
    async setKey(_tenant: string | undefined, provider: string, key: string) {
      const c = await readConfig();
      await writeConfig({ keys: { ...(c.keys ?? {}), [provider]: key } });
    },
    async deleteKey(_tenant: string | undefined, provider: string) {
      const c = await readConfig();
      const keys = { ...(c.keys ?? {}) };
      delete keys[provider];
      await writeConfig({ keys });
    },
  };
}

// ── Custom providers ─────────────────────────────────────────────────────────
// A slug for a user-named provider: lowercase, alnum + dashes, ≤40 chars.
export function slugifyProvider(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

// True if `slug` is a registry built-in — a custom provider must NOT shadow one,
// else resolveModel would pin the key to the built-in's baseUrl, not the user's.
export function isBuiltinProvider(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(PROVIDERS, slug);
}

// The custom-provider connection for the SELECTED provider, else null. Threaded
// into resolveModel so a custom key resolves against its own baseUrl+protocol;
// built-ins return null → stay registry-pinned.
export async function selectedCustomConn(): Promise<CustomProviderConn | null> {
  const c = await readConfig();
  const p = c.provider || DEFAULT_PROVIDER;
  return c.customProviders?.[p] ?? null;
}

export async function upsertCustomProvider(slug: string, conn: CustomProviderConn): Promise<void> {
  const c = await readConfig();
  await writeConfig({ customProviders: { ...(c.customProviders ?? {}), [slug]: conn } });
}

export async function removeCustomProvider(slug: string): Promise<void> {
  const c = await readConfig();
  if (!c.customProviders?.[slug]) return;
  const next = { ...c.customProviders };
  delete next[slug];
  await writeConfig({ customProviders: next });
}
