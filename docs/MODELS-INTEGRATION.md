# @rahmanef/models → os-vps AI integration

**Status: first slice SHIPPED + verified (2026-07-15).** Designed by a 3-agent workflow
(`models-integration-design`) that mapped both codebases; grounded against live code.

## What it does
os-vps's AI (the **Alfa** assistant) now resolves its model + BYOK key + host-gated
endpoint through the vendored **`@rahmanef/models`** registry (`resolveModel()`),
instead of a single hardcoded Anthropic key. Multi-provider, single-owner, self-contained.

## Key decisions
- **Vendored the lib** (`lib/models/*.js`, 7 files) rather than an npm/file/github dep —
  the src is **zero-dep ESM** (`node:` builtins + relative imports only), so it drops in with
  **0 new npm deps** and no install-graph/deploy risk. Server-only (reads `node:fs`/env — never
  import from a client component). *Sync from `models-rahmanef-com/src/*.js` when it updates.*
- **`resolveModel()` only, not `chat()`** — the lib's `chat()` returns buffered JSON; os-vps
  streams SSE. So we use the lib for key + **host-gate** (a provider's key is pinned to its own
  `baseUrl`, can't be redirected) + model + protocol, and **keep the Anthropic SDK** for the stream.
- **`hostCredentialStore()`** (`lib/config/store.ts`) implements the lib's `CredentialStore` over the
  existing **0600 `~/.os-vps/config.json`**, per-provider, with the env chain (`ANTHROPIC_API_KEY`…)
  as fallback. Single-owner → `tenantId` ignored. Legacy `anthropicApiKey` stays a read alias →
  **existing installs migrate for free**.
- **No new cloud/Convex** — reuses the host config file. Essence intact.

## The seam (`app/api/assistant/route.ts`)
`resolveModel(await resolveModelRef(), { store: hostCredentialStore() })` → `{apiKey, baseUrl,
model, protocol}`; `new Anthropic({ apiKey, baseURL })`; `model: resolved.model`. Throws on no key →
`501 no_api_key` (unchanged UX). Non-anthropic protocol → `501 provider_not_wired` (fenced until the
streaming adapter lands). SSE writer, abort→billing-cutoff, rate-limit, auth, approve-per-call gate
all **untouched**; every client speaks the neutral `delta|tool_use|done|error` vocab → zero client changes.

## Verified
`GET /api/config` → `{provider, model, hasApiKey, apiKeyMasked}`; Settings → AI shows a **model
`<Select>`** (claude-opus-4-8/sonnet-5/haiku-4-5/fable-5); Alfa with no key → graceful "No Anthropic
API key set…" (the resolveModel path ran + threw → 501). With a key (config file or `ANTHROPIC_API_KEY`
in `.env.local`) Alfa streams via the resolved provider/model. Build bundles the vendored ESM cleanly.

## Slices 2 + 3 — SHIPPED (2026-07-15)
- **Slice 2 — openai-protocol streaming adapter** (`lib/ai/openai-stream.ts`): native `fetch`
  `POST {baseUrl}/chat/completions {stream:true}`, parses `choices[].delta` → `delta`, accumulates
  `tool_calls[]` by index → `tool_use`+`done`; `toOpenAITools`/`toOpenAIMessages` translate tools +
  `tool_use`/`tool_result` both ways. The `route.ts` 501 fence is **gone** — it now branches on
  `resolved.protocol` (anthropic = SDK, else = adapter), sharing the SSE writer / abort / rate-limit;
  the client's `delta|tool_use|done|error` vocab is unchanged (zero client changes). Unit-tested
  (`openai-stream.test.ts`: cross-read SSE buffering + split tool_call reassembly). **Unlocks OpenAI
  + ~34 compatible providers** (`registry.js`).
- **Slice 3 — provider picker**: `GET /api/models[?provider=]` (`app/api/models/route.ts`,
  session-gated, `listModels()` from the offline-tolerant models.dev cache) + a provider `<Select>`
  in `ai-section.tsx` (8 curated providers) with catalog-backed free-text model suggestions
  (`<datalist>`, so an id absent from the catalog still works offline). `config/route.ts` +
  `store.ts` already persisted keys per-provider → unchanged. (Optional: `MODELS_CACHE_DIR=~/.os-vps/models-cache`.)
- **Verified live:** `/api/models?provider=openai` → 56 models; picker lists Anthropic / OpenAI /
  OpenRouter / Google / Groq / xAI / DeepSeek / Mistral; Alfa streams via the resolved provider once
  a key is set (Settings → AI or the provider env var).

## Out of scope
Usage/spend stats, simultaneous multi-model, and **OAuth sign-in**: the OpenAI *platform* API
(`/v1`) is **BYOK-key-only** — there is no OAuth flow that mints `/v1` credentials. The only "OpenAI
OAuth" that exists is the ChatGPT-*consumer* device-auth (Codex backend, unofficial / ToS-gray, NOT
`/v1`) — a separate, large, fragile effort against an unofficial API, deliberately not bundled here.

## Files
`lib/models/` (vendored), `lib/config/store.ts`, `app/api/assistant/route.ts`,
`app/api/config/route.ts`, `frontend/slices/os-settings/components/ai-section.tsx`.
