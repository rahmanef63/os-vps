// HTTP API for per-user model CRUD — the shared surface behind BOTH a UI and the CLI
// (same as how hermes/openclaw back their dashboards). Web-standard Request -> Response, so
// it mounts anywhere: Convex httpAction, Next.js route handler, Bun.serve, Deno, Node http.
//
// Storage + auth are INJECTED (host keeps its own auth provider):
//   createModelsApi({ store, authenticate })
//   - store: a CredentialStore (fileCredentialStore / convex / memory)
//   - authenticate(req) -> tenantId | null   (verify YOUR session/token; null => 401)
//
// Routes (CRUD on the models a user owns via their keys):
//   GET    /health                 -> { ok }
//   GET    /providers              -> { providers:[{provider,hasKey}] }   (keys never returned)
//   PUT    /providers/:provider    body { apiKey }  -> upsert (create+update)
//   DELETE /providers/:provider    -> 204
//   GET    /models[?all][?refresh] -> { models:[...] }  (default: only the user's providers)
//   POST   /chat  body { model, messages, ... } -> upstream response  (uses the user's key)

import { listModels } from './catalog.js'
import { resolveModel } from './resolve.js'
import { chat } from './call.js'

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

/**
 * @param {{ store: import('./store.js').CredentialStore, authenticate:(req:Request)=>Promise<string|null>|string|null, cors?:boolean }} opts
 * @returns {(req:Request)=>Promise<Response>}
 */
export function createModelsApi({ store, authenticate, cors = false }) {
  const ch = cors
    ? {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,PUT,DELETE,POST,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type',
      }
    : {}

  return async (req) => {
    const url = new URL(req.url)
    const path = url.pathname.replace(/\/+$/, '') || '/'

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: ch })
    if (path === '/health') return json({ ok: true }, 200, ch)

    // /models GET: catalog is public with ?all; otherwise scoped to the user's providers.
    // Authenticate FIRST so an unauthenticated caller can't force an outbound models.dev
    // refresh (?refresh) — that path would run before the 401 and amplify traffic.
    if (path === '/models' && req.method === 'GET') {
      const uid = await authenticate(req)
      const force = url.searchParams.has('refresh') && !!uid
      const models = await listModels({ force }).catch(() => [])
      if (url.searchParams.has('all')) return json({ models }, 200, ch)
      if (!uid) return json({ error: 'unauthorized' }, 401, ch)
      const mine = new Set(await store.listProviders(uid))
      return json({ models: models.filter((m) => mine.has(m.provider)) }, 200, ch)
    }

    // everything below requires an authenticated user (fail closed: '' is not a valid id)
    const tenantId = await authenticate(req)
    if (!tenantId) return json({ error: 'unauthorized' }, 401, ch)

    if (path === '/providers' && req.method === 'GET') {
      const provs = await store.listProviders(tenantId)
      return json({ providers: provs.map((provider) => ({ provider, hasKey: true })) }, 200, ch)
    }

    const m = path.match(/^\/providers\/([^/]+)$/)
    if (m) {
      const provider = decodeURIComponent(m[1])
      if (req.method === 'PUT') {
        if (!store.setKey) return json({ error: 'store is read-only' }, 405, ch)
        const { apiKey } = await req.json().catch(() => ({}))
        if (!apiKey || typeof apiKey !== 'string') return json({ error: 'apiKey (string) required' }, 400, ch)
        await store.setKey(tenantId, provider, apiKey)
        return json({ provider, hasKey: true }, 200, ch)
      }
      if (req.method === 'DELETE') {
        if (!store.deleteKey) return json({ error: 'store is read-only' }, 405, ch)
        await store.deleteKey(tenantId, provider)
        return new Response(null, { status: 204, headers: ch })
      }
    }

    if (path === '/chat' && req.method === 'POST') {
      const { model, messages, ...rest } = await req.json().catch(() => ({}))
      if (!model || !messages) return json({ error: 'model and messages required' }, 400, ch)
      try {
        const resolved = await resolveModel(model, { tenantId, store })
        return json(await chat(resolved, { messages, ...rest }), 200, ch)
      } catch (e) {
        return json({ error: String(e?.message || e) }, 400, ch)
      }
    }

    return json({ error: 'not found' }, 404, ch)
  }
}
