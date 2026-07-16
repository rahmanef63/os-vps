// resolveModel — turn a `provider/model` ref + a tenant into a ready-to-call descriptor.
// Pure & offline by default (no network); pass {info:true} to attach models.dev metadata.
//
// SECURITY (host-gate, hermes' key-selection fix): the key is fetched by PROVIDER slug and
// paired only with THAT provider's baseUrl. Provider A's key can never be sent to provider B.

import { getCatalog } from './catalog.js'
import { PROVIDERS } from './registry.js'

/**
 * @typedef {object} ResolvedModel
 * @property {string} ref
 * @property {string} provider
 * @property {string} model
 * @property {string} baseUrl
 * @property {string} apiKey
 * @property {'openai'|'anthropic'} protocol
 * @property {object|null} info  models.dev metadata (only when opts.info)
 */

/** Split on the FIRST '/', so model ids may contain '/' (OpenRouter style). */
export function parseRef(ref) {
  const i = ref.indexOf('/')
  if (i < 1 || i === ref.length - 1) throw new Error(`bad model ref "${ref}", expected "provider/model"`)
  return { provider: ref.slice(0, i), model: ref.slice(i + 1) }
}

/**
 * @param {string} ref "provider/model"
 * @param {{tenantId?:string, store:import('./store.js').CredentialStore, baseUrl?:string, protocol?:'openai'|'anthropic', info?:boolean}} opts
 * @returns {Promise<ResolvedModel>}
 */
export async function resolveModel(ref, { tenantId, store, baseUrl, protocol, info = false } = {}) {
  const { provider, model } = parseRef(ref)
  const conn = PROVIDERS[provider]
  if (!conn && !baseUrl) throw new Error(`unknown provider "${provider}" — add it to registry.js or pass opts.baseUrl`)
  if (!store) throw new Error('resolveModel needs a CredentialStore (opts.store)')

  const apiKey = await store.getKey(tenantId, provider)
  if (!apiKey) throw new Error(`no API key for provider="${provider}" tenant="${tenantId ?? 'default'}" — user must BYOK`)

  const resolved = {
    ref, provider, model,
    // host-gate: known providers are PINNED to their registry endpoint so a caller-supplied
    // baseUrl can never redirect a provider's key to another host. Override only honored for
    // unknown providers (conn undefined), which require baseUrl to resolve at all.
    baseUrl: conn ? conn.baseUrl : baseUrl,
    apiKey,
    // known providers keep their registry protocol; a custom (conn-less) provider
    // uses the caller's declared protocol, defaulting to openai-compatible.
    protocol: conn?.protocol || protocol || 'openai',
    info: null,
  }
  if (info) {
    const cat = await getCatalog().catch(() => ({}))
    resolved.info = cat?.[conn?.catalogId || provider]?.models?.[model] ?? null
  }
  return resolved
}
