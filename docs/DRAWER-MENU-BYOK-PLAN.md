# Shell Action Contract + BYOK Add-Provider — Plan

> **Ask (2026-07-16):** (1) mobile **drawer** not applied in-app; (2) feature slices not
> refactored to feed the **OS menu / drawer format** like the Apple mock; (3) BYOK not like
> the **"add provider"** flow in `../models-rahmanef-com`.
>
> **Scope:** structural (shell↔app contract) + BYOK. Presentation-only iOS parity is tracked
> separately in `IOS-PARITY-REFACTOR-PLAN.md` (written, largely un-shipped) — **not** this doc.
>
> Built from a 3-probe audit (2026-07-16): mock UX spec · current shell chrome · BYOK-vs-models.

## 0. Constraints

1. **Do NOT rebuild os-vps to the mock's `prepare(ctx)→os` merge model.** os-vps apps are React
   components in a window store; that model is fine. Reuse the **existing live bus**, don't fork the shell.
2. **VPS essence** — no fabricated hardware in any new chrome.
3. **Two-seam safety** — mobile changes ride `mobile-shell.tsx` (iOS-only mount) + `android-shell.tsx`
   (Android-only mount); shared primitives gate on `useActiveShell().id`, never `surface`.
4. os-vps rules: shadcn primitives, tokens-not-hex, ≤200 lines/file, barrel imports, no new deps.
5. BYOK: SSRF-guard any user base URL; single-owner host-JSON store (no Convex); key stays 0600.

## 1. Findings (probe-verified, file:line)

### Menu / drawer — the plumbing is ~80% present; only *population* + *in-app trigger* missing
- **Mock desktop menu bar** = generic-by-app-**name** template `{apple, app, File, Edit, View, Window, Help}`,
  hover-to-switch, `action`-string dispatch. **os-vps already matches this** — `menu-bar.tsx:40-77`
  renders logo · brand · app-name · (File/Edit/View) · Window · Help, and `DefaultMenus`
  (`menu-bar-menus.tsx:71-118`) are **functional** (New Window, Cut/Copy/Paste, Full Screen, Spotlight, Inspector).
- **Mock app contract** = each slice's `prepare(ctx)` returns shell-slot fields (`navTrailing/onTrailing`,
  `showTabBar/tabItems`, `toolbarActions`, `windowTitle`) + raises drawers via `ctx.act.open*`.
  **os-vps apps feed the shell nothing** — each renders its own in-window chrome.
- **`AppDescriptor.menus`** exists (`lib/types.ts:85`) and both the desktop bar (`menu-bar.tsx:69`) and the
  home long-press sheet (`mobile-home-parts.tsx:21`, `AppActionSheet`) already consume it — but **no app populates it**.
- **The live data already exists:** the AI-Inspector bus (`appshell/lib/inspector.ts`) publishes per-app
  `actions: [{id,label,run}]` with real closures — **all 14 apps publish** (PROGRESS Phase 11). `usePublishInspector`
  clears on unmount, so only *running* apps expose actions. **This is the menu/drawer data source.**
- **Mobile in-app:** iOS header (`mobile-shell.tsx:215-224`) = icon · centered title · **Done** only. Android header
  (`android-shell.tsx` ~155-161) = back · title. **No per-app action affordance while an app runs** ← the "drawer belum diterapkan".

### BYOK — streaming is already custom-baseUrl-ready; gap is storage + UI
- os-vps BYOK (`os-settings/components/ai-section.tsx`) = one active provider+model+key, **8 hardcoded**
  providers, plaintext `~/.os-vps/config.json` (0600), **no** custom endpoint / key-test / list-delete / OAuth.
- **Enabler:** streaming already consumes `resolved.baseUrl`+`resolved.protocol` (`lib/ai/openai-stream.ts`,
  `app/api/assistant/route.ts:100`); `lib/models/resolve.js:47` honors a caller `baseUrl` **for non-built-in slugs**.
  So custom-provider = **storage + UI + one wiring line**, not a streaming rebuild.
- **Reference** (`../models-rahmanef-com/web/frontend/slices/byok/`): `CustomProviderForm` (fields/JSON,
  `custom-provider-config.ts` parser), auto-validate on save (`testCredential`+`cheapestModel`),
  `ConnectedCreds` list+remove, SSRF `_shared/ssrf.ts`, encrypted `modelCreds`. OAuth (OpenAI/Claude/OpenRouter/Copilot).

## 2. Design decision

**One mechanism, both menu surfaces:** surface the focused/active app's **inspector `actions`** as
(a) a desktop menu-bar app menu and (b) a mobile in-app bottom-sheet drawer. Zero per-slice edits, no new bus,
reuses live handlers. `AppDescriptor.menus` (static) stays available for future richer per-app File/Edit/View,
but is **not** required for this pass.

**BYOK:** port the *custom-provider* + *validate* + *list/delete* core from models-rahmanef-com into the
host-JSON store (single-owner). **OAuth deferred** to Phase D (big lift; the mock's "Sign in with OpenAI" is
Codex device-code, not the platform API) — say the word to pull it forward.

## 3. Tasklist

### Phase A — Shell action contract (desktop app menu + mobile in-app drawer) `[core]`
- **A1** `useInspectorInfo(focusedId)?.actions` → new `AppActionsMenu` in `menu-bar-menus.tsx`; render in
  `menu-bar.tsx` after the app-name menu when non-empty. *(~20 lines, 1 new small component)*
- **A2** iOS in-app drawer: trailing **"•••"** button in `mobile-shell.tsx:215` header → local `sheetOpen` →
  bottom-sheet of the active app's actions. Extend `AppActionSheet` (`mobile-home-parts.tsx:14`) with optional
  `actions`+`inApp` (skip "Open", slide-up `sheetUp` anim for mock fidelity), or a thin `AppActionsSheet`. *(~30 lines)*
- **A3** Android parity: same "•••" → sheet in `android-shell.tsx` header. *(~15 lines)*
- **Guard:** iOS edits live in the iOS-only mount; Android in the Android-only mount; desktop menu addition is
  additive (empty list → nothing renders) → macOS/Windows/Dashboard unchanged.

### Phase B — BYOK storage + wiring `[core]`
- **B1** `lib/host/ssrf.ts` — port `assertSafeUrl` (block loopback/link-local/private ranges). *(~40 lines + test)*
- **B2** `lib/config/store.ts:11` — add `customProviders?: Record<slug,{baseUrl;protocol?;models?}>`; slugify +
  reject built-in slugs (mirror `customProvider.ts:14`). *(~25 lines)*
- **B3** `app/api/config/route.ts` — GET returns **all** keys + custom providers (not just selected);
  POST accepts a custom provider (SSRF-checked); support per-provider DELETE. *(~40 lines)*
- **B4** `app/api/assistant/route.ts:100` — when selected slug is custom, pass `{baseUrl}` to `resolveModel` +
  thread `protocol`. *(~5 lines)*

### Phase C — BYOK add-provider UI `[core]`
- **C1** Port `custom-provider-form.tsx` + `custom-provider-config.ts` → `os-settings/components/`. *(~120 lines)*
- **C2** `app/api/models/test/route.ts` — 1-token validation call through the resolve path (port `testCredential`+`cheapestModel`). *(~40 lines)*
- **C3** `ai-section.tsx` — add "Add provider" (custom form), a provider **list + delete**, and a health badge
  after save/test. Optionally expose the full ~36 registry providers. *(~60 lines)*

### Phase D — OAuth `[deferred]`
Port `convex/oauth.ts`+`oauthCopilot.ts`+`app/oauth/*` (device-code + PKCE + refresh + encrypted tokens).
Not started; explicit go needed.

## 4. Verification
- Playwright (mock shells): iOS in-app "•••" → drawer lists Files actions + runs one; desktop menu bar shows
  Files-specific menu when Files focused; Android "•••" → drawer. Screenshot each.
- BYOK: add a custom OpenAI-compatible endpoint from the UI, key-test returns a badge, provider appears in the
  list, assistant streams through the custom baseUrl; delete removes it. Verify SSRF rejects `http://169.254.169.254`.
- Gates: `pnpm verify` (tsc · lint · vitest) green before ship. Never `pnpm build` in prod to verify.

## 5. Log
- 2026-07-16 — plan written from the 3-probe audit.
- 2026-07-16 — **Phases A/B/C shipped.** A: `AppActionsSheet` (new) + inspector-fed desktop app
  menu + iOS/Android in-app "•••". B: `OsConfig.customProviders`, `lib/host/ssrf.ts` (+test),
  `resolveModel` protocol override, config GET-list/POST-custom/DELETE, custom conn threaded into
  the assistant. C: `custom-provider-form.tsx` + `custom-provider-config.ts` (+test) + `provider-list.tsx`
  + `/api/models/test` + ai-section rewrite. Gates: tsc + lint clean, vitest 299. Behaviorally verified
  on an isolated `:4011` dev server (prod untouched): iOS+Android "•••" → Files actions (New folder /
  Refresh / Empty Trash); desktop Files menu lists the same. **Phase D (OAuth) deferred.**
</content>
</invoke>
