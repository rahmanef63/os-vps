// CredentialStore — the multi-tenant seam both openclaw and hermes lack.
// Everything routes through getKey(tenantId, provider). Swap the impl to change where
// BYOK keys live (env, memory, Convex, your own DB) without touching resolve logic.
//
// @typedef {object} CredentialStore
// @property {(tenantId:string|undefined, provider:string)=>Promise<string|null>} getKey
// @property {(tenantId:string|undefined, provider:string, key:string)=>Promise<void>} [setKey]
// @property {(tenantId:string|undefined, provider:string)=>Promise<void>} [deleteKey]
// @property {(tenantId:string|undefined)=>Promise<string[]>} [listProviders]

import { readFile, writeFile, mkdir, chmod, rename } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { PROVIDERS } from './registry.js'

/**
 * Single-tenant / dev store: reads keys from env using each provider's envVars chain.
 * Priority stolen from openclaw: MODELS_LIVE_<P>_KEY override wins, then the ordered chain.
 * @returns {CredentialStore}
 */
export function envCredentialStore() {
  return {
    async getKey(_tenantId, provider) {
      const live = process.env[`MODELS_LIVE_${provider.toUpperCase()}_KEY`]
      if (live) return live
      const vars = PROVIDERS[provider]?.envVars || [`${provider.toUpperCase()}_API_KEY`]
      for (const v of vars) if (process.env[v]) return process.env[v]
      return null
    },
    async setKey() { throw new Error('envCredentialStore is read-only') },
  }
}

/**
 * In-memory multi-tenant store — tests / ephemeral use. Map<tenant, Map<provider, key>>.
 * @returns {CredentialStore}
 */
export function memoryCredentialStore() {
  const t = new Map()
  const k = (id) => id ?? ''
  return {
    async getKey(id, p) { return t.get(k(id))?.get(p) ?? null },
    async setKey(id, p, key) {
      let m = t.get(k(id))
      if (!m) { m = new Map(); t.set(k(id), m) }
      m.set(p, key)
    },
    async deleteKey(id, p) { t.get(k(id))?.delete(p) },
    async listProviders(id) { return [...(t.get(k(id))?.keys() ?? [])] },
  }
}

const DEFAULT_CREDS_FILE = join(process.env.MODELS_CREDS_DIR || join(homedir(), '.models-rahmanef'), 'creds.json')

/**
 * Persistent multi-tenant store — a local JSON file `{ tenant: { provider: key } }`, mode 0600.
 * Lets the CLI / a local server work with no external DB (like hermes' ~/.hermes/auth.json).
 * ponytail: whole-file read-modify-write with an atomic tmp+rename — safe for a CLI / single
 * writer (no truncated file on crash); add file locking if you get concurrent writers
 * (last-writer-wins today).
 * @param {string} [filePath]
 * @returns {CredentialStore}
 */
export function fileCredentialStore(filePath = DEFAULT_CREDS_FILE) {
  const k = (id) => id ?? ''
  const load = async () => { try { return JSON.parse(await readFile(filePath, 'utf8')) } catch { return {} } }
  const save = async (data) => {
    await mkdir(dirname(filePath), { recursive: true })
    const tmp = filePath + '.tmp'
    await writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 })
    await chmod(tmp, 0o600).catch(() => {}) // enforce perms even if the tmp pre-existed
    await rename(tmp, filePath) // atomic swap on same fs — never leaves a truncated creds file
  }
  return {
    async getKey(id, p) { return (await load())[k(id)]?.[p] ?? null },
    async setKey(id, p, key) { const d = await load(); (d[k(id)] ||= {})[p] = key; await save(d) },
    async deleteKey(id, p) { const d = await load(); if (d[k(id)]) { delete d[k(id)][p]; await save(d) } },
    async listProviders(id) { return Object.keys((await load())[k(id)] || {}) },
  }
}
