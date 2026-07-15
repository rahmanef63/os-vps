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

## Deferred (documented, not built)
- **Slice 2 — openai-protocol streaming adapter** (`lib/ai/`): `POST {baseUrl}/chat/completions
  {stream:true}`, parse `choices[].delta`, translate tool schemas + `tool_use`/`tool_result` both ways.
  Unlocks all ~35 OpenAI-compatible providers (OpenAI/OpenRouter/Groq/DeepSeek/xAI/Mistral/…) behind
  the same seam. *This is why slice 1 fences non-anthropic with a 501.*
- **Slice 3 — multi-provider picker**: a provider `<Select>` + catalog-driven model list via a new
  `GET /api/models` (`listModels()` from the offline-tolerant models.dev cache; set
  `MODELS_CACHE_DIR=~/.os-vps/models-cache`).
- **Out of scope:** usage/spend stats, OAuth device-code/PKEC sign-in, simultaneous multi-model.

## Files
`lib/models/` (vendored), `lib/config/store.ts`, `app/api/assistant/route.ts`,
`app/api/config/route.ts`, `frontend/slices/os-settings/components/ai-section.tsx`.
