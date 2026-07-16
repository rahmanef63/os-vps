# os-vps — Progress Log

Running log of what shipped each phase. Newest at top.

> **Architecture note:** Phases 0–14 below were built on **Convex self-hosted +
> a Control-Room host-agent bridge**. That stack was **removed** in Phase 15 —
> os-vps is now a self-contained Next.js app (`lib/host` + signed-cookie auth).
> Read those phases as history; `ARCHITECTURE.md` is the current truth.

## 2026-07-16 (round 6) — "Alfa, forget this" tool (DONE)

Twin of `memory.remember`: a `memory.forget` host-tool (read-tier) that matches saved
facts by phrase (substring), deletes each match via `/api/memory`, and reports what it
removed. Catalog entry + HOST_SYSTEM guidance + registry test. tsc + lint + vitest green.
Also added the gitignored root `progress.md` (local session log).

## 2026-07-16 (round 5) — "Alfa, remember this" tool (DONE)

Alfa can now save facts to memory itself, not just via Settings: a `memory.remember`
host-tool (read-tier — runs immediately, no approval card, since it's a benign owner-scoped
write) that POSTs to `/api/memory`. One catalog entry (`host-tools/catalog.ts`) + a HOST_SYSTEM
guidance line; the registry test covers it as a read tool. tsc + lint + vitest green. It
complements the manual Settings → Alfa memory panel (both write the same `~/.os-vps/memory.json`).
**Not redeployed** — build + restart to activate.

## 2026-07-16 (round 4) — Alfa chat history (YAML threads) + cross-session memory (DONE)

Ports 2 & 3 of the models-rahmanef-com picks. tsc + lint + vitest (full suite + 4 new store
tests) green. Store logic is unit-tested; the full UI click-through (send → persist → resume;
add fact → Alfa recalls it) is best exercised on the deploy (it needs a real provider key to stream).

- **Chat history** — Alfa was stateless; now every completed turn persists to a YAML thread under
  `~/.os-vps/threads/` (`lib/ai/threads.ts` — path-jailed filenames, atomic write). `/api/threads`
  (list/get/save/delete). A History drawer (`thread-list.tsx`) in the Alfa header lists saved chats;
  resume restores BOTH the display bubbles and the wire history so the chat continues; New starts
  fresh. Persistence factored into a `use-thread-persistence` hook. YAML (not JSON) per the owner's
  request — readable session files (`yaml` dep added).
- **Cross-session memory** — durable facts recalled into Alfa's system prompt, matched to the latest
  user turn by word overlap (`lib/ai/memory.ts`; `~/.os-vps/memory.json`). `/api/memory`
  (list/add/delete). The assistant route recalls + injects for EVERY provider path (codex/anthropic/openai).
- **Token savers** — Settings → AI → Output style: Normal / Caveman (terse) / Ponytail (lazy senior
  dev) → appended to the system prompt (`OsConfig.tokenSaver`).
- New Settings **"Alfa memory"** panel (`memory-section.tsx`) under the AI section: output-style
  picker + add/delete facts. **Not redeployed** — build + restart to activate.

## 2026-07-16 (round 3) — Model catalog browser (DONE)

First of three models-rahmanef-com feature ports the owner picked (catalog browser ·
chat history · cross-session memory). tsc + lint + vitest green.

- **Model catalog browser** — `/api/models` now carries capability/pricing meta (context
  window, $/M input+output, tool/reasoning/vision support) from the models.dev catalog; a
  searchable **Browse** dialog (`model-catalog.tsx`) in Settings → AI lists the selected
  provider's models with that meta, click to set the model. Pure UI over the vendored
  `@rahmanef/models` catalog; degrades to "No catalog" for custom/OAuth providers (not in
  models.dev). **Not redeployed** — build + restart to activate.

Chat history (YAML thread store) + cross-session memory are next.

## 2026-07-16 (round 2) — BYOK OAuth: "Sign in with OpenAI" (Codex device-code) (DONE)

Phase D1 of DRAWER-MENU-BYOK-PLAN — the explicit ask ("oauth ai openai"). tsc + lint +
vitest (301) green; the Codex device-flow **start verified against the live OpenAI
endpoint** (HTTP 200 + user_code). The poll→token→chat round-trip needs the owner's
ChatGPT authorization to exercise.

- **OAuth framework** — token bundles in the 0600 host config (`OsConfig.oauthTokens`),
  transient handshake state in-memory (`lib/ai/oauth/flow-state.ts`), a per-provider
  start/poll route (`app/api/oauth/[provider]/route.ts`). OAuth providers surface in the
  connected-list (kind `oauth`), selectable + deletable.
- **OpenAI Codex** (device-code) — `lib/ai/oauth/codex.ts` (start/poll/exchange/refresh +
  `decodeAccountId` + models) + a **bespoke ChatGPT-backend Responses streamer**
  (`lib/ai/codex-stream.ts`): the platform `/chat/completions` path does NOT work — Codex
  hits `chatgpt.com/backend-api/codex/responses` with the OAuth bearer, the account id
  decoded from the token JWT, and SSE `response.output_text.delta`. Public Codex-CLI client
  id (no secret, no registration). The assistant route bypasses `resolveModel` for
  `openai-codex`, refreshes the token (120 s margin) before each call, streams via `streamCodex`.
- **UI** — Settings AI panel: "Sign in with OpenAI (ChatGPT)" → device-code (shows the user
  code, opens the verification page, polls to completion). `oauth-connect.tsx`; the active
  provider's key row + Test hide for OAuth providers.
- **Caveats (documented):** Codex is a reverse-engineered CONSUMER endpoint — needs a ChatGPT
  Plus/Pro subscription, can break if OpenAI changes it, and is **chat-only (no Alfa tools)**.
  Tokens are stored plaintext in the 0600 host file (os-vps's existing posture; at-rest
  encryption is a later pass). **Not redeployed** — build + restart to activate.

## 2026-07-16 — Shell action contract (drawer + OS menu) + BYOK add-provider (DONE)

Closed the gap the Apple mock flagged: feature slices now feed the shell's
menu/drawer format, and BYOK matches models-rahmanef-com's "add provider". Built
from a 3-probe audit → `DRAWER-MENU-BYOK-PLAN.md`. tsc + lint + vitest (299) green;
behaviorally verified on an isolated `:4011` dev server (prod never touched).

- **Shell action contract — one bus, both surfaces.** The AI-Inspector bus already
  publishes live per-app `actions` (all 14 apps). Surfaced them as (a) the desktop
  menu-bar app menu (`menu-bar.tsx` reads `useInspectorInfo(focusedId).actions`) and
  (b) a mobile in-app bottom-sheet drawer — a trailing "•••" in the iOS
  (`mobile-shell.tsx`) + Android (`android-shell.tsx`) app headers opens the new
  `AppActionsSheet` (shadcn Sheet side=bottom). No per-slice edits, no new bus. Did
  NOT rebuild to the mock's `prepare(ctx)→os` merge model. Verified: iOS/Android
  "•••" → New folder/Refresh/Empty Trash for Files; desktop Files menu lists the same.
- **BYOK add-provider — custom endpoint + validate + list/delete.** Streaming already
  consumed `resolved.baseUrl`+`protocol`; added the storage+UI: `OsConfig.customProviders`
  (`lib/config/store.ts`), SSRF guard (`lib/host/ssrf.ts` + test), a `protocol` override on
  `resolveModel` (`lib/models/resolve.js`), `/api/config` GET-list / POST-custom / DELETE,
  `/api/models/test` (1-token validation), and the Settings AI panel: custom-provider form
  (`custom-provider-form.tsx` + `custom-provider-config.ts` + test, ported from
  models-rahmanef-com), connected-provider list with delete (`provider-list.tsx`), Test badge.
  **OAuth deferred** (Phase D — big lift; the mock's "Sign in with OpenAI" is Codex device-code,
  not the platform API).
- Guards: iOS/Android edits live in their single-mount shells; the desktop menu addition is
  additive (empty actions → nothing renders); a null custom conn keeps built-ins registry-pinned
  → macOS/Windows/Dashboard byte-unchanged. **Not redeployed** — `pnpm build` + `sudo systemctl
  restart os-vps.service` to activate.

## 2026-06-15 — upload-DoS P0 closed (independent QA loop)

An independent QA `/loop` rated os-vps and shipped the one **P0 a parallel audit
session missed** — an authenticated DoS in `/api/v1/fs/upload`. Both on `origin/main`:

- **`b4b90c5`** — `fs/upload` no longer buffers every multipart part into RAM
  (`req.formData()` OOM-kills the host process that *is* the cockpit). New
  `lib/host/multipart.ts` streaming parser + `lib/host/fs-upload.ts` spool-to-tmp
  with backpressure + atomic rename within write-root bounds; `proxyClientMaxBodySize`
  500mb → 256mb.
- **`4ddc70f`** — cap **raw** pulled bytes (oversized preamble/header could still
  grow the buffer unbounded) + `lib/host/multipart.test.ts` (6 tests incl. both
  bypass vectors). `tsc` clean, vitest 293 passing.

**Not redeployed** — `pnpm build` + `sudo systemctl restart os-vps.service` to
activate. See `HANDOFF-2026-06-15.md` for full context **and** the
concurrent-session collision lesson (run ONE session on os-vps at a time).

## Where things stand (2026-06-11) — recovery anchor

Four rounds shipped to `main` today, all green (typecheck + lint + vitest 162 +
build), prod + demo redeployed. Details in the dated entries below.

- **R1** `818a8ca` — full 6-pass audit → `docs/AUDIT-2026-06-11.md` +
  `docs/SHELL-FIDELITY-PLAN.md` (the roadmap the fidelity work follows).
- **R2** `89f4210` — audit fix wave 1–4: 5 app P0s + the P1 tail + hygiene
  (deleted media-studio's ~1,870-line orphan, tailwind-merge→3, global-error) +
  security hardening (sensitive denylist, audit redaction, child-env scrub).
- **R3** `82aeaaa` — dynamic per-shell context menu (`appshell/lib/context-menu.ts`
  registry, all 5 shells) + live/interactive wallpaper (TSX registry + sandboxed
  HTML iframe, `liveWallpaper` capability).
- **R4** `f31b893` — fidelity Phase A+B: per-shell `data-shell` tokens
  (font/radius/icon/ease/dur) + window open/close/minimize motion + geo glide.

**Next move (not started):** SHELL-FIDELITY-PLAN **Phase C** — one
`<WindowPreview>` primitive feeding Mission Control / Windows taskbar hover /
Android recents / iOS switcher; it also fixes the audited switcher
double-session bug (iOS mounts live `WindowContent` per card today). Then
Phase D per-shell signature behaviours. Deferred from the audit (documented):
the UX error-doctrine sweep, confirm/undo pass, focused-window hotkey capability.

---

## 2026-06-11 (round 4) — Shell fidelity Phase A+B: per-shell tokens + window motion (DONE)

First two phases of `SHELL-FIDELITY-PLAN.md`. CSS-first, zero new deps.

- **Phase A — per-shell design tokens.** `data-shell={id}` on the Surface root;
  globals.css defines `--shell-font / -radius-win / -radius-ui / -icon-radius /
  -ease / -dur-fast|dur|dur-slow` with per-OS overrides: macOS/iOS 10px + SF
  stack + `cubic-bezier(.32,.72,0,1)`; Windows 8px/4px + Segoe + decelerate
  curve; Android 300ms + Roboto + **circular** icon mask (50%). The window
  radius fork (`rounded-md` vs `rounded-[var(--radius-win)]`) collapsed to
  `--shell-radius-win`; app icons use `--shell-icon-radius`; menu bar / taskbar /
  window titles use `--shell-font` (CHROME only — app content keeps the theme
  preset's typeface, so the recent preset-font work is not regressed).
- **Phase B — window lifecycle motion.** `winOpen` on mount; `winClose` /
  `winMin` via a component-LOCAL phase that finalizes the SYNCHRONOUS store
  action on `animationend` (store contract unchanged — `closeAll`/tests stay
  sync; guarded editors skip the animation so the confirm dialog isn't over a
  faded frame). `.win-geo` glides maximize/snap/restore; the drag + resize hooks
  set `transition:none` mid-gesture so per-frame moves never lag. Mobile
  `appOpen` durations tokenized. `prefers-reduced-motion` collapses to ~1ms.
- Verified on demo (Playwright, computed styles + screenshots): macOS window
  10px + SF titlebar, Windows 8px + Segoe + caption buttons, Android icons 50%,
  geo-transition + open animation live, zero page errors. Gates green, 162 tests.
  Prod + demo rebuilt.
- Next in the plan: Phase C (one `<WindowPreview>` primitive → Mission Control /
  taskbar hover / recents / iOS switcher; also kills the switcher double-session
  bug), then per-shell signature behaviours (Win taskbar grouping + Alt-Tab +
  snap-layouts; iOS zoom-from-icon + status bar; Android notification shade +
  ripple).

## 2026-06-11 (round 3) — Dynamic per-shell context menu + live/interactive wallpaper (DONE)

Two requested features, both on new brand-free appshell registries (rr-liftable).

- **Dynamic per-shell context menu** — `appshell/lib/context-menu.ts`:
  `registerContextMenu(ShellId | "*", provider)` → `getContextMenuItems(ctx)`;
  providers run at OPEN time with `{shell, surface, x, y}` so items are fully
  dynamic. `useShellContextMenu(shell)` + `<ShellContextMenu>` merge each shell's
  built-ins with the registry. Wired into ALL FIVE shells: macOS + Windows
  (built-ins → registry), Dashboard (Home-view right-click), iOS + Android home
  (long-press / contextmenu, skips controls). os-shell injects dynamic items in
  `integrations.ts` ("New Files window" desktop-only, "Change wallpaper…",
  "Lock screen" mobile, "Open System Monitor" on dashboard). Fixed a latent bug:
  the Windows desktop menu hung off a div shadowed by the window section — moved
  to the section with the currentTarget guard (macOS pattern).
- **Live / interactive wallpaper** — one capability field
  (`ShellAppearance.liveWallpaper`, wins over image + preset), two sources:
  (1) **from code (TSX)** via `appshell/lib/wallpaper-registry.ts`
  `registerWallpaper({id,label,render,interactive?})` — os-shell ships Drift
  (token-colored CSS blobs) + Starfield (rAF canvas, pauses when hidden,
  pointer-attracts when interactive); (2) **from the frontend (HTML)** — user
  pastes a page in Settings, rendered by the shell in a **sandboxed iframe**
  (`sandbox="allow-scripts"` only — opaque origin, no cookies/parent DOM/authed
  `/api`), size-capped + shape-validated (`normalizeLiveWallpaper`). A "receives
  clicks" toggle turns the desktop window layer `pointer-events-none
  [&>*]:pointer-events-auto` so empty-desktop clicks reach the wallpaper (it works
  as a live website); windows/dock/menus stay on top. UI:
  `os-settings/components/live-wallpaper-rows.tsx`; SECURITY.md documents the
  sandbox model.
- Gates: typecheck + lint + build green, vitest 154 → 162 (context-menu registry
  + wallpaper-normalizer tests). New files ≤200 LOC; appshell stayed brand-free.
  Prod rebuilt + restarted.

## 2026-06-11 (round 2) — Audit fix wave 1–4: P0/P1 bugs + hygiene + security hardening (DONE)

Acted on `AUDIT-2026-06-11.md`. 73 files, +973/−300; typecheck + lint + build
green, vitest 136 → 154. 6 disjoint agents did the app slices; shell core +
lib + security done by hand. Prod rebuilt + restarted.

- **App P0s fixed:** image-editor export now renders the DOC rect at doc
  resolution (Transformer/shadow hidden during capture) + a failed project load
  no longer clobbers the file (load-success gate); Settings SSH "Laptop" target
  editable (server-targets dedupe precedence inverted); code-editor ⌘S saves
  instead of opening the browser dialog (scoped stopPropagation); files-manager
  "Download" actually downloads (raw-URL anchor).
- **App P1s:** files rename-collision + same-dir cut-paste guards + failed-listing
  error state; image-editor delete/duplicate keep paint pixels + imports stored as
  data URLs (not dead `blob:`) + editor hotkeys scoped to the focused window;
  code-editor stale-buffer/openPath/inspector-save fixes + dirty-tab close guard;
  assistant abort seam end-to-end (Stop button, `req.signal`, no token bleed after
  close) + partial reply kept on error + conversation survives tab switch; browser
  unmount closes remote pages (keepalive) + "service offline — Retry" state;
  settings AI-key save errors surfaced; login errors visible in pending state +
  English strings; quicklinks hydrate shape-guarded; prefs writes serialized.
- **Shell core (hand):** resize commits via `offsetLeft/offsetTop` (no +30px
  drift); Spotlight `useSearch` memoized (no infinite search loop); pollers gated
  on `document.hidden`; `hydrateBoot` dedupes a multi-app window by payload (no
  Files dup on `/files/*` reload); restored + resized windows clamped on-screen
  (`clampRect` + resize listener); window stacking + ⌘Tab + close-focus now follow
  z (focus recency); dock/Window-menu read a reactive windows map (no stale hover
  lists); `inEditable` guards on ⌘I + ⌘⇧V; context menu above the dock; dead
  `.dark .wp-material` → `[data-theme=dark]`; dashboard wallpaper no longer hidden;
  clipboard/recents SSR snapshots stabilized.
- **Hygiene:** deleted media-studio's ~1,870-line orphan editor (manifest
  trimmed); `tailwind-merge` 2 → 3 (Tailwind 4 class tables); `app/global-error.tsx`;
  `agent-log` route reads `readAuditTail()` (no lib/host bypass); `.env.example`
  gains `OS_FS_ALLOW_SENSITIVE` + `OS_PREFS_PATH`; ARCHITECTURE catch-all fix.
- **Security hardening:** sensitive-file denylist extended (`.aws`/`.kube`/
  `.docker`/`.config/gcloud`/`.netrc`/`.git-credentials`/`*_history`); browser
  fill/type audit lines redact typed values; spawned shells (exec + PTY) run with
  the app's own secrets scrubbed from env (`lib/host/child-env.ts`) — `printenv`
  no longer leaks the session secret/BYOK key; SECURITY.md notes the `/proc`
  residual. New tests: child-env scrub, clampRect, server-targets, quicklinks,
  prefs serialization.
- Deferred (documented, not done this wave): UX error-doctrine sweep, confirm/undo
  pass, focused-window hotkey capability, the SHELL-FIDELITY-PLAN phases.

## 2026-06-11 — Full audit + shell fidelity plan (docs only, no code changes)

- **`docs/AUDIT-2026-06-11.md`** — six parallel audit passes (security, shell
  core, app slices, fidelity inventory, Next/React best-practice, DX) over
  HEAD `84e857c`; single-source P1s re-verified by hand. Headlines: security
  clean (no P0/P1 — hardening list only); 5 app P0s (image-editor export
  renders viewport + failed-load clobbers files, Settings SSH target
  uneditable, code-editor ⌘S broken while typing, Files Download stub);
  5 shell P1s (resize +30px drift `use-window-drag.ts:96`, Spotlight infinite
  search loop `os-shell/capabilities.ts:42`, deep-link reload duplicates Files
  windows `store-persist.ts:60`, no offscreen re-clamp, z-order by creation
  not focus). Fix waves 1–5 prioritized at the bottom (data safety first).
- **`docs/SHELL-FIDELITY-PLAN.md`** — make the 5 shells feel native to their
  OSes while staying light: shared foundations first (per-shell `data-shell`
  token layer, motion scale + window lifecycle animation, system font stacks,
  one `<WindowPreview>` primitive, z-ladder tokens, shell code-splitting),
  then per-shell top cuts (macOS scale-minimize + Spaces strip; Win11 taskbar
  grouping + snap-layouts popup + Alt-Tab; iOS zoom-from-icon + status bar +
  edit mode; Android status bar + notification shade + ripple + back-bus;
  Dashboard ops-console identity). Phases A–F + authenticity cheat sheet.
  Hard constraints: no new deps, CSS-first motion, verify on demo :4006.
- No code changed; prod untouched.

## 2026-06-10 (round 3) — Full upstream sync into rr: shell framework + every OS app slice (DONE)

- **rr (`resources`) is no longer "basic"** — the whole os-vps feature set is
  now consumable from the catalog by any project (`npx rr add <slug>`):
  - **appshell 1.4.0** in rr = byte-synced to this repo's framework (Android
    Material-You rebuild, macOS dock behaviour, window store + snap geometry,
    UrlSync, shell registry minus the phantom "mobile" id, store-persist split,
    Clock/HomeIndicator/pull-down/swipe-close/overview-key, `useQuickLinks`
    capability + `QuicklinkIcon`). The 10 shell features (search/inspector/
    notifications/control-center/widgets/clipboard/share/quick-look/
    shortcut-help/lock-screen) synced into rr's bundled `appshell/features/*`.
  - **Dashboard shell LIFTED into the framework** (rr bundles it; brand via
    `useBrand`, stats via the capability seam) — os-vps keeps its consumer copy.
  - **12 app slices upgraded** in rr via per-slice 3-way merges that keep rr's
    self-contained `lib/host.ts` seams (mock adapters + `configure*()` for real
    wiring): browser (multitab/screencast/AI panel), os-terminal (exec emulator
    + injectable PTY), file-explorer, assistant, reel-editor, image-editor,
    app-store, media-viewer, system-monitor, image-picker (incl. the CSS-escape
    security fix), code-editor.
  - **3 new lifts**: media-studio 1.0.0, quicklinks 1.0.0, shell-settings 1.0.0
    (+ catalog entries, previews, agent.md). Skipped: os-settings (Topside-
    specific), create-app (already bundled in rr app-store).
  - rr gates all green: tsc · eslint 0 · vitest 448 · slices:check 68 slices.
- **Backported here from rr's lint-zero sweep** (keeps the trees
  line-mergeable): desktop.tsx snap-key ternary→if/else; InspectorAI drops the
  unused `appId` destructure. Behaviour identical — prod NOT redeployed for
  this; next deploy picks it up.

## 2026-06-10 (round 2) — Theme preset owns the typeface; font pipeline actually works now (DONE)

- **Font picker merged into theme presets**: the tweakcn preset's
  `cssVars.theme` font-sans/font-mono IS the typeface config — the separate
  "Font family" picker + `fontFamily` tweak are gone (legacy stored/synced
  values scrubbed on hydrate; `fontScale` a11y sizing stays). Preset chips show
  which face they ship.
- **Preset webfonts load for real** (`lib/appearance/presets/fonts.ts`):
  `applyPreset()` now injects ONE Google Fonts css2 link for the named families
  (local/system/Geist names skipped; offline degrades to the Geist fallback in
  the stack; `clearPreset()` removes it).
- **Two silent root-cause bugs fixed — no custom font EVER rendered before**:
  (1) Geist `variable` classes were on `<body>` while `:root --font-ui`
  referenced `var(--font-geist-sans)` → guaranteed-invalid custom property →
  body fell back to the Tailwind preflight stack; Geist classes moved to
  `<html>`. (2) `@theme inline { --font-mono: var(--font-mono) }` was a
  self-referential var() cycle that killed monospace tokens; chrome token
  renamed `--font-mono-ui` (terminal consumers updated).
- E2e-verified on demo: picking "Elegant Luxury" → computed body font Poppins,
  `document.fonts.check` true, link href carries Poppins+IBM Plex Mono; Stock
  reset removes the link and restores Geist (which itself renders for the first
  time). Zero console errors.

---

## 2026-06-10 — Shell parity sweep: Android rebuilt · Dashboard store-driven · wallpaper presets retired (DONE)

Two audits (provider/wrapper consistency + a 12-feature × 5-shell parity
matrix) drove this round; every gap found was built, not just listed.

- **Android shell rebuilt for parity**: status-bar row removed (user call: the
  SCREEN header goes, the wallpaper clock stays) — big clock + date back on the
  wallpaper; pull-DOWN on home now opens the REAL Control Center feature
  (`controlCenter` slot + `ShellUIProvider`; the fake wifi/bt Shade is deleted),
  via the new shared `usePullDown` hook (fires at threshold, pointercancel-safe,
  scroll-aware). Root is transparent so the shared `<Wallpaper>` (auto →
  `wp-material`, or the user's custom image) finally shows. `home` is derived
  from the pathname (iOS pattern) → deep links / back-forward work in Android
  now. Search pill → Spotlight. App header pads `--sai-top` (notch). Drawer
  close handle ≥36px hit; Recents ✕ 36px on coarse pointers.
- **Resume-don't-duplicate** (iOS + Android): a home tap on a running app now
  `focusApp`s its window instead of spawning a second one (Files used to
  multiply on every tap).
- **Dashboard shell store-driven**: dropped its private `route` state — panes
  are real store windows (`openWindow`/`minimizeWindow`, focused-window
  derivation), so URL sync, deep links and title sync work; added a Running
  sidebar section (resume/✕), an app filter, and the missing
  `[container-type:inline-size]` on the pane.
- **Windows shell**: ⌘Tab AppSwitcher + NotificationCenter mounted (clock is
  now the notifications button), F3 Task View via the extracted
  `use-overview-key` hook, Start menu closes on Esc.
- **macOS**: Launchpad gets a live search field + `inert` while closed (its ~20
  links were tab-reachable invisible); desktop context menu gains "Close all";
  Launchpad z drops to 8400 (was colliding with the clipboard overlay at 8500).
- **iOS**: status clock in the top safe-area strip (shared `<Clock>`); switcher
  ✕ 36px on coarse pointers.
- **Wallpaper presets retired**: aurora/dusk/mist/graphite/noir picker grid is
  gone from Settings → Appearance — theme presets own color identity; wallpaper
  is "auto" (per-shell native backdrop) or a custom image. Legacy stored keys
  coerce to "auto" on every hydrate path (`normalizeWallpaper`); shell-backdrop
  CSS (`wp-aurora/graphite/win11/material/ios`) stays.
- **Provider/wrapper audit fixes**: `AppRegistryProvider`+`ResponsiveProvider`
  hoisted above the feature-provider seam (a `FeatureDescriptor.provider`
  calling `useResponsive` no longer throws by construction); capabilities merge
  memoized + `undefined`-stripped; pre-hydration theme script kills the
  dark-mode light flash; Settings used raw `env(safe-area-inset-bottom)` and
  ignored the iOS +34px pill bump (now `var(--sai-bottom)`); profiles read
  `sv:shell` via the registry SSOT (`getShellPrefs`); `MOBILE_W` deduped;
  appearance/quicklinks context values memoized; phantom `"mobile"` ShellId
  deleted; mobile dock ids moved from a hardcode in generic appshell to
  `AppDescriptor.pinned` set by the Topside manifest.

---

## 2026-06-09 (round 2) — Mobile maximized: prefs sync · terminal key bar · deep-link fixes (DONE)

Phone testing surfaced the real gaps — everything below e2e-verified on prod
(Playwright login + device approval at 390×844, then revoked).

- **Cross-device prefs sync** (`4b7cf04`): phone no longer boots to fresh
  defaults (wrong wallpaper/theme, empty quicklinks, mock mode). Appearance
  tweaks + quicklinks persist to `~/.os-vps/prefs.json` (atomic 0600) via
  session-gated `/api/prefs` (mirrors `/api/config`). localStorage hydrates
  first, server wins on initial GET, changes debounce 1.5 s POST per section,
  last-write-wins. POSTs disabled until a GET succeeds (pre-auth defaults can
  never clobber server prefs); login fires `os-vps:authed` to re-pull without a
  reload. `wallpaperStyle` is computed → stripped both sides. Demo: zero calls.
  Device-specific state (window layout, clipboard, profiles, recents) stays
  local on purpose.
- **Terminal touch key bar** (`ce97b6a`): control-room-style accessory row for
  the PTY terminal — Esc, Tab, sticky Ctrl/Alt (arms next key-bar press OR next
  soft-keyboard char via xterm `onData` intercept; Alt = ESC-prefix), arrows,
  Home/End/PgUp/PgDn, ^C ^D ^L ^Z, `| ~ / -`, clipboard paste. Shows on
  `pointer:coarse` or compact panes; `pointerdown.preventDefault` keeps xterm
  focus + soft keyboard up. Mock/exec terminal unchanged (line-based, no bar).
- **Mobile Done resets URL** (`9bf592f`): `minimizeWindow` left `focused`
  intact so UrlSync never re-fired — URL stuck on `/files` after dismiss.
  UrlSync now derives from the *visible* (focused AND not-minimized) app;
  dismiss → `replaceState("/")`, deep-link onto a minimized app restores it.
  Also covers the Android shell home button.
- **Persisted layout vs deep links** (`29bc59b`, found by e2e): boot
  `hydrate()` rebuilt the store from `os-vps:layout` AFTER UrlSync opened the
  deep-linked window — returning devices got the grid or a stale URL rewrite.
  New `hydrateBoot()` merges (live windows keep id/payload/focus on top,
  persisted single-instance dupes drop, multi apps coexist via id remap);
  profile/layout apply keeps replace semantics. +7 store-persist tests.
- Tests 124 → **136**. Verified: PTY echo/history/^C through the key bar on
  prod, prefs file write + server-hydrate after localStorage wipe, deep-link
  with saved layout (Files focused over restored windows, URL intact), demo
  regression-free.

## 2026-06-09 — Hardening + Phase E responsive sweep + PTY terminal + stock search (DONE)

- **API hardening** (`dec2c5f`): `HostError` + `apiError` across all 35 `/api/v1`
  routes — curated messages pass through as 400 (they're UX), everything else is
  masked to "Operation failed" + logged server-side with the route name, so raw
  Node errors (ENOENT/EACCES with absolute paths) never reach the client.
  Dependency-free input validation (`readJson`/`requireString` kit in
  `lib/host/api-error.ts`, no zod) on exec + fs mutations; `verifySession` now
  requires a numeric `expires_at`. Tests 41→124 (session sign/verify, path
  bounds/symlink escapes, destructive-filter table, pty e2e).
- **A11y/UX** (`3602d0e`): specific aria-labels (window controls, browser nav,
  appearance swatches); settings config errors surface as a toast; loading spinners.
- **200-line rule** (`c123786`): files-manager `app`/`use-files` + browser
  `use-remote-browser` split into focused modules.
- **Phase 3+4 responsive sweep DONE** — browser, media-viewer, image-editor/
  media-studio (compact prop + pane-relative sheet), reel-editor compact tabs,
  app-store chips + `TouchList`, create-app `@xl` two-col, assistant composer
  safe-area + compact save-button fix. Container-first (`useContainer`/
  `@container`) throughout — no new `matchMedia`. Tracker: MOBILE-RESPONSIVE-PLAN.md.
- **system-monitor**: live process table — fixed a real `ps` parse bug
  (multi-word comm names broke the positional split in `lib/host/sys.ts`);
  compact card rows via `TouchList`.
- **Stock search**: `/api/v1/stock/search` — keyless Openverse by default,
  optional `OS_UNSPLASH_ACCESS_KEY` → Unsplash (key stays server-side).
  image-picker "Stock" tab is live with debounce/attribution/error states.
- **PTY terminal**: `node-pty` + `@xterm/xterm`. `lib/host/pty.ts` session
  manager (ring buffer + `Last-Event-ID` resume, 8-session cap, 30-min idle
  reap, `term.open`/`term.close` audited); `/api/v1/term/{open,stream,input,
  resize,close}` SSE bridge. Live mode = a real interactive shell (vim/top/ssh
  work); mock untouched; falls back to one-shot exec if the PTY fails.
- **Skipped on purpose**: response-shape unification. The error shape
  (`{ error: string }`) is already uniform via `apiError`; a full `{ok,data}`
  wrapper would be client churn for no user value.

---

## 2026-06-06 — Multi-shell OS: macOS · Windows 11 · Android · iOS · Dashboard (P1–P6 complete)

Ported the multi-shell system matured in app-rahmanef's appshell fork back into the
framework (two-way merge — close guards/winId/Button-sweep/dock deep-links all kept).
`registry/shells.tsx` + per-surface shell prefs (Settings → Appearance → Shell);
Windows 11 chrome (taskbar/Start/Snap-Assist, caption-button windows), Android
Material-You shell, Dashboard cockpit (os-shell consumer, single-pane over AppHost +
useSystemStats home), iOS NC pull-down + app long-press; chrome-aware snap re-tile
(WindowState.snapZone + applyChromeInsets); wallpaper=auto → per-OS presets. Lifted
to rr as appshell 1.2.0 (resources 2f653ea, all slice gates green). Tracker:
docs/MULTISHELL-PLAN.md. Deployed: build + systemctl restart, site 200.

## 2026-05-31 — Phase 18: Maximize Next.js — addressable OS (routing/Link/Image) (DONE)

Stopped treating the shell as a client-only SPA (one route, all client state) and
leaned into Next App Router — **without touching the windowing model** (user keeps
multi-window OS; URL just mirrors the focused app).

- **Catch-all route** `app/[[...slug]]/page.tsx` replaces the single index page.
  A generic `UrlSync` (appshell core) mirrors the FOCUSED app + its launch path to
  the URL (`/files/home/rahman`, `/code`, `/terminal`). Deep links open that window
  on load; back/forward walks focus history. Two-way + loop-guarded (refs for
  pathname, live focus read from the store). Opt-out via `manifest.routing=false`.
- **History API, not router.push.** Opening a window is pure client state, so
  `UrlSync` rewrites the address bar with `window.history.push/replaceState` (Next 16
  syncs `usePathname`) — instant, no RSC roundtrip, no remount. router.push caused a
  full route transition + UrlSync remount on every open (caught + fixed in verify).
- **App slugs** assigned centrally in the manifest (`AppDescriptor.slug`, falls back
  to `id`) so app slices stay URL-agnostic: files/code/terminal/monitor/…
- **Link-based launch.** Dock + Launchpad render `<Link href>` (real anchors):
  ⌘/middle-click opens an app in a new tab (deep link); plain left-click stays an
  in-place window open (preventDefault → openWindow, URL synced by UrlSync).
- **Per-route metadata** — `generateMetadata` derives `<title>` from the slug
  ("Code — Topside"), verified server-side via curl.
- **next/Image** for browser favicons (fixed Google s2 host in `images.remotePatterns`).
  Host-fs images + the live Playwright screenshot stream stay raw `<img>` on purpose
  — dynamic/auth'd bytes the optimizer can't help with (documented in next.config).
- Shipped A→fix chain (`4987d7d` route+Link+Image · `4a72f36` loop fix · `d482513`
  History API). Verified on demo: deep-link /code + /files/home/rahman, dock→URL,
  back/forward focus history, 12 dock hrefs, server titles. prod :4005 + demo :4006 200.

---

## 2026-05-31 — Phase 17: AppShell framework — manifest-driven, features as slices (DONE)

Restructured the monolithic `os-shell` slice into a generic, rr-liftable shell
framework + pluggable feature slices. **Pure restructure — zero frontend change**
(parity-verified by before/after screenshots at desktop 1280 + phone 390).

- **`appshell` slice (generic, brand-free)** — the shell runtime/chrome moved here
  from os-shell: window store, surfaces (desktop window-mgr + iOS mobile shell),
  app registry, the pub/sub buses (toast/activity/inspector), and the chrome
  skeleton (menu-bar/dock/launcher/wallpaper/windows). Lifts to rr as-is.
- **One responsive source of truth** — `<ResponsiveProvider>` + `useResponsive()`
  replaced the two duplicate `useIsMobile` (inline + `@/hooks/use-mobile`).
  `useContainer()` + safe-area tokens. DRY primitives `AppFrame`/`MasterDetail`/
  `ResponsiveToolbar`/`TouchList` built + exported (adoption deferred — that's a
  frontend change).
- **Manifest-driven** — `<AppShell manifest>` is the single entry point; a project
  supplies `{ brand, apps, features }`. `FeatureRegistryProvider` + `<Slot region>`
  compose the surfaces from config (open/closed: add a feature = manifest edit).
  Brand (name/logo) now flows from the manifest into the menu-bar.
- **Features as slices** — `shell-search` (overlay/Spotlight), `shell-inspector`
  (rightPanel + AI), `shell-notifications` (toast + Dynamic Island), `shell-control-center`,
  `shell-widgets` (Today). Mobile features read surface state via a `ShellUI`
  context instead of props. Buses stay in core so apps don't depend on feature
  slices. `os-shell` is now a thin consumer: `shell.manifest.ts` (Topside brand +
  app list + features) + a re-export barrel, so all app slices stay untouched.
- Shipped per phase (A `7be0491` · B `7be0491` · C `08ed734` · D `cd716ab`),
  typecheck + build green each, prod :4005 + demo :4006 verified 200.

Lift-prep done (Phase F `ee2b7a9`): de-genericised appshell's last consumer
literals (persist key + idle name → manifest), de-Convex'd os-shell metadata,
added trios. Capability injection done (Phase G `b16ac0a`): appshell core no
longer imports `@/lib/{appearance,os-api}` — appearance + CPU readout come via
`manifest.capabilities`; os-vps adapts its store/host in `os-shell/capabilities.ts`.
The framework core is now brand- AND consumer-free (only the universal `cn`
helper remains). Verified behaviour-neutral (theme toggle, CPU chip, wallpaper,
device detection, mobile surface all intact).

Feature-slice capability injection done (`eb671fa`): the `shell-*` slices no longer
import `@/lib/*` either (except the universal `cn`). Their data deps now arrive via
`ShellCapabilities` — `useSearch` (Spotlight → `SearchHit[]`), `useSystemStats`
(Today widgets), `useChat` (scoped AI stream), `useServerToggle` (optional control-
center server tile). os-vps wires the real `@/lib` sources in `os-shell/capabilities.ts`.
The **entire shell** (core + features) is now consumer-free. Verified behaviour-neutral
(Spotlight search + theme command, mobile Today telemetry "CPU 61% 8 cores").

Remaining: adopt the responsive primitives across app UIs (the visible mobile
sweep — deferred, it changes the frontend).

---

## 2026-05-31 — Docs reconcile (DONE)

Docs had drifted: PLAN / ARCHITECTURE / DESIGN-RECONCILE / SLICE-CATALOG still
described Convex + the agent bridge (gone since Phase 15), and this log stopped at
Phase 14. Fixed: ARCHITECTURE + PLAN rewritten to the self-contained reality;
DESIGN-RECONCILE stamped ARCHIVE with a "what actually shipped" diagram;
SLICE-CATALOG re-keyed to the host contract + all 14 slices listed; this log
brought current. `MOBILE-RESPONSIVE-PLAN` flagged as not-yet-built (DRY primitives
`useResponsive`/`AppFrame`/`MasterDetail`/`ResponsiveToolbar`/`TouchList` = 0 files).

---

## 2026-05-30/31 — Phase 16: Files CRUD + DnD upload polish (DONE)

- **DnD upload of files AND folders** (`82ac15d`) — binary-safe. `lib/host/fs.ts`
  `uploadInto` (jailed, atomic tmp+rename, 100 MiB/file); multipart `/api/v1/fs/upload`;
  `webkitGetAsEntry` recursive walk (`read-drop.ts`); split Upload Files/Folder UI.
- **One-action New Folder + Spotlight folder search** (`5d46c6b`) — `cmd.newFolder`
  (mkdir → auto-select → inline rename); `searchFs` (dirs under `~/projects`, jailed,
  skips node_modules/.git/…) + `/api/v1/fs/search`; Spotlight opens apps AND folders.
- **Rename pre-selects the name** (`37c699c`) — typing replaces, Finder-style.
- **Demo FS persists to localStorage** (`2fee6a1`) — mock tree mirrored to
  `os-vps:demo-fs` so a visitor's sandbox survives reload (structure, not bytes).
- **Whole-window drop zone** (`15ace18`) — the entire Files window is a drop target
  (drops on toolbar/padding no longer fall through to the browser), with a "Drop files
  & folders" overlay + Uploading/Uploaded toasts + a flat-file fallback.

---

## 2026-05-30 — Phase 15: Self-contained pivot + security + Topside rebrand (DONE)

The big architecture change: **dropped Convex + the external Control-Room agent.**
os-vps now runs AS a host process and controls its own machine directly.

- **Self-contained host layer** — `lib/host/` (fs/exec/sys/paths) is the single
  facade for `/api/v1`; signed-cookie auth (`lib/auth/`, HMAC `OS_SESSION_SECRET` +
  password + device approval) replaced `@convex-dev/auth`. Layout/registry →
  localStorage; device allowlist + BYOK config → `~/.os-vps/*.json`. No Convex, no agent.
- **Security pass** (`4a293cd`) — append-only JSONL audit (`lib/host/audit.ts`,
  `~/.os-vps/audit.log`); exec destructive-command guard (`rm -rf /`, mkfs, dd,
  fork bomb…) bypass via `OS_EXEC_ALLOW_DESTRUCTIVE`; exec rate-limit; tight default
  FS scope (read+write = home + ~/projects); 24h sessions; README threat model.
- **Rebrand os-vps → Topside** (`56b3707`) — dropped the "OS" overclaim in all
  user-facing strings (it's a cockpit/utility, not an OS). Repo/service/domain slug
  unchanged.
- **os-browser to loopback** — Playwright service rebound 127.0.0.1:4002 (was 0.0.0.0);
  stale ufw 4002 docker-bridge rules cleaned.

---

## 2026-05-30 — Phase 14: Real browser (Playwright) — drivable + screenshots + persistent session (DONE)

The iframe-proxy couldn't beat google's CSP. Replaced it with a REAL headless
Chromium on the host (Playwright, Apache-2.0) — renders any site, drivable from
the CLI, with a persistent session/cache so logins stick + no per-site API needed.

- **Host service** `os-browser` (new repo `/home/rahman/projects/os-browser`,
  systemd, loopback :4002, secret-gated): `chromium.launchPersistentContext`
  (userDataDir `~/.os-vps/chrome-profile` = cookies/cache/session on disk). HTTP
  API: navigate/screenshot/state/content/click/type/key/scroll/back/forward/reload.
  ufw: docker0 + docker_gwbridge on 4002 (non-public).
- **os-vps**: `lib/agent/server.ts` `browserConfigured()`+`browserFetch()`; 11
  `app/api/v1/browser/*` routes (Convex-auth-gated → `172.18.0.1:4002`). Browser
  slice rewritten to a single REMOTE view: live screenshot `<img>`, click mapped to
  the 1280×800 viewport, keyboard/wheel forwarded, settle-poll after actions.
  Deleted tab-strip/new-tab/blocked-overlay (real browser needs none). Dokploy env
  `OS_BROWSER_URL` + `OS_BROWSER_SECRET` set.
- **CLI**: `~/.claude/skills/os/os-browser.sh` (go/shot/content/click/type/key/
  scroll/state/back/…) drives the SAME session — screenshots land in /tmp so they
  can be viewed. `/os-browser-list` rewritten to check the real service.
- Verified on host: google/github/HN/example all render (screenshots viewed),
  content extracted, session persists.

---

## 2026-05-30 — Phase 13: Browser fix + full function audit + /os-list, /os-browser-list (DONE)

- **Browser "tidak berfungsi" diagnosed**: backend was 100% fine (proxy renders with
  a valid token). Real causes were client-side: (a) token async-null → iframe
  flashed a 401, (b) in-page links escaped the frame → frame-blocked.
- **Fixes**: browser waits for `useAuthToken()` ("Establishing session…") + re-keys
  iframe on token (no 401 flash); proxy injects a click/submit interceptor →
  `postMessage({__osb,url})` → app re-proxies + syncs omnibar (in-page nav works).
- **Full live audit** (signed in via device-password, real token): **13/13 /api/v1
  functions 2xx** — sys stats/processes, fs list/read/usage/mkdir/write/move/copy/
  delete, exec, apps, proxy. Browser proxy RENDERS example/wikipedia/HN/httpbin/
  google (base+nav injected, X-Frame-Options stripped).
- **New skills**: `/os-list` (`~/.claude/skills/os-list/`, audit.js probes every
  endpoint + app→function matrix) and `/os-browser-list` (browser-check.js tests
  the proxy across real sites). Both sign in + run live.

---

## 2026-05-30 — Phase 12: Deep VPS browse + dynamic favorites + browser proxy + /os skill (DONE)

- **Tree bug fix (couldn't descend live)**: `DirChildren` built child paths from the
  REQUESTED path ("/") not the host's canonical path → "/projects" → outside roots.
  Now uses the agent-returned `r.path` as the base → full real tree browsable
  (home → projects → any depth).
- **Agent read = whole filesystem** (explorer.ts): `OS_AGENT_FS_READ_ROOTS` (set `/`
  in .env.local) — same access the pty already grants. WRITES stay bounded to
  home + ~/projects (`OS_AGENT_FS_WRITE_ROOTS`). read ops (read/usage) now follow
  read-roots, not write-roots.
- **Dynamic favorites**: FsList now carries `roots` + `parent`; the agent returns
  Home / Projects / Filesystem; mock returns its shortcuts. Files sidebar renders
  favorites from `roots` (no more hardcoded /Media that 404 on the VPS). Portable
  `~` = home in both adapters (mock norm maps "~"→"/"); Files + both trees default
  to `~`, with `/` reachable via the Filesystem root.
- **Browser actually works**: `app/api/v1/proxy` (Convex-token-gated via query)
  fetches the page server-side, strips X-Frame-Options/CSP, injects `<base>` →
  iframe renders. (Limits: omnibar nav only; in-page links/heavy-SPA/auth-walled
  still constrained.)
- **`/os` skill** (`~/.claude/skills/os/`): playbook + `os.sh` to drive the VPS via
  the agent endpoints (ls/cat/write/mkdir/rm/mv/cp/exec/usage) — same bridge the
  web OS uses. Smoke-tested.

---

## 2026-05-30 — Phase 11: Shared live file-tree + AI Inspector (every app) (DONE)

Two cross-cutting features. tsc + build green.

**Shared live file-tree** (`components/shared/file-tree/`, import `@/shared/file-tree`):
- Reusable recursive tree that **lazy-loads each dir via OsApi fs.list** (mock OR
  the real VPS in Live mode → syncs the host), expand/collapse, selection, and
  **inline create-file / create-folder** (hover affordance per folder) + refresh.
- **code-editor**: dropped the static seed tree (deleted components/file-tree.tsx
  + SEED_TREE) → mounts the shared `<FileTree>`; onOpenFile routes through
  `useEditor.open` which fs.read's the live file.
- **files-manager**: added `<FileTree>` to the sidebar (Favorites top · tree
  scrolls middle · Storage bottom). Folder click → navigate main pane; file click
  → new `cmd.openPath` (code-editor / media-viewer handoff).

**AI Inspector** (os-shell, ⌘I / menu View + ✨ status button):
- `os-shell/lib/inspector.ts` — typed module bus (mock-os OSBus pattern made real):
  apps `usePublishInspector(appId, {subject, props, actions, context, suggestions}, deps)`
  to publish their live state + callable actions. Keyed by appId; panel reads the
  FOCUSED app's descriptor.
- `components/inspector.tsx` — right-docked panel, tabs **Properties** (live state
  rows + one-click actions) | **AI** (`inspector-ai.tsx`: scoped Alfa chat — prepends
  the app's context + props so replies are grounded in what you're looking at;
  reuses the real /api/assistant stream, moved to neutral `lib/ai/stream.ts` to
  avoid a slice cycle). Suggestion chips per app.
- **All 14 apps publish descriptors**: browser (URL/title/tabs/bookmarks + reload/
  newtab/bookmark/home), code-editor (file/lang/lines/unsaved + save/new),
  files-manager (path/items/selected/storage + newfolder/refresh/empty-trash),
  media-studio, media-viewer, reel-editor, system-monitor (cpu/mem/disk/procs/mode
  + refresh), os-terminal (cwd/cmds/mode + clear), os-settings, app-store,
  create-app, assistant. Each wired to REAL state/handlers.

---

## 2026-05-30 — Phase 10: Live backend — fs write + exec + real render (DONE)

Closed the 4 "still mock" gaps so the OS actually drives the VPS. tsc + build green.

**Agent (vps-rahmanef, live systemd `vps-control-room-agent`)** — additive, CR not
touched:
- `agent/src/fs/mutate.ts` — read/write/mkdir/delete/move/copy/usage, **same
  allowed-roots bounds as the read explorer** (home + ~/projects), symlink-resolved
  before the check; atomic write (tmp→rename); refuses to modify a root.
- `agent/src/exec/run.ts` — one-shot shell (`/bin/bash`), cwd bounded to roots,
  30s timeout, 1 MiB output cap → `{stdout,stderr,code}`.
- Registered `GET /fs/read|/fs/usage`, `POST /fs/write|/fs/mkdir|/fs/delete|/fs/move|
  /fs/copy|/exec` in `health-server.ts`, all behind `requireGatewayAuth`.
- Built + restarted; smoke-tested via loopback: all ops OK, `/etc/passwd`→400
  (bounds hold), no-auth→401, real `whoami`/disk. Agent still 0.0.0.0:4001,
  CR frontend `active`, container→172.18.0.1:4001/health 200.

**os-vps frontend:**
- OsApi `exec` simplified to one-shot `run(cmd, cwd?) => {stdout,stderr,code}`
  (dropped unused pid/stream/kill) across types + mock + http adapters.
- 9 new `app/api/v1` proxy routes (fs read/write/mkdir/delete/move/copy/usage,
  exec/run, apps) — Convex-auth-gated, same pattern as fs/list.
- `sys/processes` now REAL (parses `ps` via exec) instead of `[]`.
- **os-terminal**: Live mode wires mkdir/rm/mv/cp/touch to OsApi fs; unknown
  command → host shell passthrough (`exec.run`). Mock UX unchanged.
- **files-manager** mutations (already wired) now hit the real VPS in Live.
- **reel-editor**: fake progress bar → **real client-side render** (Canvas 2D →
  `MediaRecorder` → downloadable `.webm`), real progress + cancel. No ffmpeg/deps.
- **runtime-app**: non-html installed apps → live exec console (Run → `exec.run`
  → stdout/stderr/exit), replacing the static manifest card.

Parity now ~100% depth / 100% coverage. Live mutations + exec + render all real;
behind device-approval auth + gateway secret + non-public agent (ufw DROP).
Remaining non-goals: interactive pty (vim/top) — one-shot exec only; audio in
reel render (canvas stream is video-only).

---

## 2026-05-29 — Phase 9: Finish all apps (full parity sweep) (DONE)

Lifted every below-par app to ~full mock-os parity (7 parallel subagents, each
its own slice, rr-clean ≤200 lines/file, mock-backed). tsc + build green.

- **reel-editor** (55→~90): comp presets + fps, clip drag/resize/split/dup/move,
  per-clip keyframes + lane graphs, clip props + text entrance anims, live
  preview canvas, undo/redo, NL "AI edit", mock render overlay, shortcuts.
- **media-studio** (65→~90): clip masks, safe-area guides, HTML-embed + image
  layers, per-layer custom CSS, JSON/HTML import, real undo+redo (50-deep,
  debounced), color palette, JSON/HTML export modal.
- **assistant** (35→~85): tabbed Chat/Agents/Skills/Automations + agent/skill/
  automation editors + grouped tool picker (localStorage). Chat still the REAL
  Claude stream; active agent persona prepended to the sent messages.
- **media-viewer** (70→~90): audio waveform player, video transport, image
  zoom + dims + checkerboard, type chip, download, open-in-editor handoff.
- **files-manager** (75→~90): drag-drop move, Trash (~/.Trash + Empty Trash),
  real file-picker upload, selected-item details strip.
- **os-settings** (75→~90): About pane (version + live sys/storage + Reset),
  Server test-connection chip, reduce-transparency (already had shell-style).
- **mobile shell** (60→~85): status bar (clock + signal/wifi/battery), home
  grid + dock + page dots, app-switcher (swipe-up cards, tap-focus, swipe-to-
  close), home-indicator drag gestures.

Already ≥80% and left as-is: browser, app-store, create-app, system-monitor,
os-terminal. Parity now ~88% depth, 100% app coverage.

---

## 2026-05-29 — Phase 8: Dynamic app registry + modular polish (DONE)

Made the app layer **dynamic** (apps added at runtime appear live) while keeping
slices **modular** (each self-contained behind its barrel; one declarative list).

Core (shell + Convex):
- **Window payload**: `openWindow(app, title, size?, payload?)` + `WindowState.payload`;
  every app component now receives a `payload?: unknown` prop (`AppProps` exported
  from os-shell). Re-open with new payload updates + focuses.
- **Convex `features/apps`**: per-owner runtime app registry — `create`,
  `setInstalled`, `remove`, `listInstalled`, `listAll`. 
- **Dynamic registry**: `app-store/lib/use-installed-apps` turns installed rows
  into `AppDescriptor`s (icon via a glyph→Lucide map; `RuntimeApp` host renders
  html entries in a sandboxed iframe, else a manifest card). `app/os-root.tsx`
  now merges `BUILTIN_APPS` + `useInstalledApps()` inside the auth boundary —
  no more hardcoded-only list.

Wired (subagents, parallel, disjoint slices):
- **create-app** → real Create App form (name→slug, runtime autofill, glyph +
  gradient picker, live manifest preview) → `apps.create` → app appears in dock.
- **app-store** → 6-app catalog merged with live install state; Get/Uninstall →
  `apps.setInstalled`; installed apps surface in dock/launchpad.
- **open-file-by-payload** → files-manager routes a file to code-editor (`{path}`,
  read via fs.read) or media-viewer (`{path,name,kind}`, remote→"open in editor"
  handoff) through `openWindow` payload.
- **shell** → full menu bar (File/Edit/View + existing os-rr/app/Log Out) + a
  toast system (`lib/toast` store + `ToastHost`, barrel-exported for any slice);
  Spotlight fires toasts on run.
- tsc green, build green. Parity now: app coverage 100%, depth ~80%, registry
  modular + dynamic.

---

## 2026-05-29 — Phase 7: App parity sweep + live host bridge ON (DONE)

Raised feature parity across the 6 thinnest apps (parallel re-author from
`mock-os/`, rr-clean, ≤200 lines/file) AND turned the real-VPS file bridge on.

**Parity upgrades** (each its own slice, mock-backed, shadcn/tokens):
- files-manager → grid/list, breadcrumb + back/fwd, favorites sidebar, multi-
  select, context menu, cut/copy/paste, rename, new-folder, storage bar, sort,
  open-by-ext. Added `fs.move`/`fs.copy` to the OsApi contract (types + mock +
  http). Live mutations fail gracefully ("read-only on live host").
- code-editor → multi-tab, file-tree explorer, Cmd+S save, status bar, new file.
- browser → back/fwd/reload/home + bounds, per-tab history, security icon,
  loading bar, bookmarks + bar, new-tab quick-links, blocked-site overlay, menu.
- os-terminal → 17-command shell (ls/cd/cat/mkdir/rm/mv/cp/df/ps/neofetch/…),
  cwd, history arrows, colored prompt; ls/cat hit OsApi fs live.
- media-studio → tools (V/T/R/O/S), layers (vis/opacity/reorder/rename), 5
  aspect presets, 8 filter chips, per-layer transform, zoom, Export JSON, undo.
- system-monitor → 4 circular gauges (CPU/Mem/Disk/GPU-mock), CPU + net
  sparklines (rolling), process table (host placeholder when empty).
- tsc green, build green.

**Live host bridge ENABLED** (real VPS directory listing):
- Agent (vps-rahmanef, systemd `vps-control-room-agent`) was loopback-only
  (127.0.0.1:4001) → unreachable from the Dokploy swarm container. Rebound to
  `AGENT_HEALTH_HOST=0.0.0.0` (keeps loopback for the CR frontend, which calls
  127.0.0.1:4001 — CR NOT broken) + restarted. ufw INPUT policy is DROP, so
  4001 stays blocked from the public iface.
- The os-vps swarm task egresses via `docker_gwbridge` (172.18.0.x); added
  `ufw allow in on docker_gwbridge to any port 4001`. Verified from inside the
  live container: `http://172.18.0.1:4001/health` → 200.
- Set Dokploy os-vps env `OS_AGENT_URL=http://172.18.0.1:4001` + `OS_AGENT_SECRET`
  (existing env preserved). Flip Settings → Server → **Live** to list the real
  VPS tree. Agent fs is **read-only** (only `/fs/list`) — listing is real,
  mutations stay mock/local.

Security: agent reachable from host containers + tailnet, NOT public (ufw DROP +
only docker0/docker_gwbridge allowed on 4001); every call still gated by the
os-vps Convex-auth route + the agent's `x-control-room-secret`.

---

## 2026-05-29 — Phase 6B: BYOK AI assistant (DONE, deployed)

Alfa now talks to a real Claude model. BYOK: the Anthropic key lives in Convex
(owner config) or falls back to the server `ANTHROPIC_API_KEY` env.

- `features/appConfig` — owner singleton {anthropicApiKey, model}. `getConfig`
  (masked: hasKey + last-4 + model), `getApiKey` (raw, server-route only),
  `setConfig` (requireUser). Key is write-only from the UI.
- `app/api/assistant/route.ts` — Node-runtime SSE stream. Auth-gated by the
  caller's Convex Bearer (`authedConvex` in `lib/agent/server.ts`, added next to
  `verifyAuth`). Resolves key = Convex BYOK || `ANTHROPIC_API_KEY`; 501 if none.
  `@anthropic-ai/sdk` `messages.stream`, model default `claude-opus-4-8`
  (configurable), `system` block with `cache_control: ephemeral`, thinking off
  for snappy chat + final-answer-only system instruction. Emits `delta`/`done`/
  `error` SSE events; last-20-turns context window; max_tokens 4096.
- `assistant/lib/stream.ts` — client SSE reader → async generator of text
  deltas, sends history + `useAuthToken()` Bearer. Replaced the mock engine
  (deleted `lib/engine.ts`); `app.tsx` streams real tokens, maps error codes to
  friendly notes.
- Settings → **AI (Alfa)** panel (`os-settings/components/ai-section.tsx`):
  password key field (shows masked), model field, Save. Reactive via Convex.
- tsc green, build green (`/api/assistant` route present), convex deployed.

Note: no key is committed. Until the owner pastes a key in Settings (or
`ANTHROPIC_API_KEY` is set on the Dokploy frontend env), the assistant returns
a "no key" note. Caching: system prompt is < the 4096-token min, so it won't
actually cache yet — the breakpoint is in place for when the prompt grows.

---

## 2026-05-29 — Phase 6A: Device-approval auth (DONE, deployed)

Replaced email/password with the Control Room device-approval model, mapped
onto Convex + `@convex-dev/auth`. Auth portal guard hardened:

- **Factor 1**: shared password in backend env `OS_LOGIN_PASSWORD` (set to the
  owner password). Checked constant-time in `convex/auth.ts`; fail-closed if
  unset/short → nobody gets in.
- **Factor 2**: the device must be `approved` in the new `devices` table. A
  correct password on a new device registers it `pending` and throws
  `device_pending` — **no token is issued until approved**. So any authenticated
  session ⇒ approved device (the gate is at token issuance, not just UI).
- `convex/auth.ts` → `ConvexCredentials({ id: "device-password", authorize })`;
  single shared owner account (`createAccount`/`retrieveAccount`, no per-account
  secret — the device IS the credential).
- `features/devices`: `touch` (internal, called post-password from authorize),
  `approve`/`revoke` (mutation, requireUser = approved device), `listDevices`
  (query), `bootstrapApprove` (internal, CLI-only for the first device).
- Login UI: password-only + a "pending" panel showing the device id (copyable)
  + "Check again". Settings → **Devices** panel (reactive list, approve/revoke,
  "This device" badge). New `auth/lib/device.ts` (128-bit hex id in localStorage).
- Bootstrap path (first device, no approver yet):
  `npx convex run features/devices/mutations:bootstrapApprove '{"deviceId":"<id>"}'`.
- tsc green, build green, convex deployed to api-os.

Caveat: revoke takes effect on next token refresh (≤ refresh-token TTL); the
gate is at sign-in. Old email/password users/accounts are now orphaned (unused).

---

## 2026-05-29 — Phase 5: Spotlight ⌘K command palette (DONE)

Cleared the top autonomous backlog item. macOS-style Spotlight over the whole
desktop — open any app + run shell actions from one box.

- `os-shell/components/spotlight.tsx` — ⌘K/Ctrl+K palette: subsequence search
  (typing "cdr" → "Code Editor"), Arrow/Enter/Esc nav, mouse hover sync, glass
  sheet. Sources: all 12 apps (open) + actions (Launchpad, Minimize all, Close
  all, Toggle theme). ≤200 lines, shadcn/token styling, no fuzzy lib.
- Store: `spotlightOpen` state + `setSpotlightOpen`/`toggleSpotlight` +
  bulk `minimizeAll`/`closeAll` ops; `useSpotlightOpen` hook.
- Global ⌘K hotkey in `desktop.tsx` (works desktop + mobile); Search button in
  the menu-bar status cluster.
- tsc green, `next build` green.

Remaining backlog is BLOCKED on user decisions:
- Real AI assistant — needs `ANTHROPIC_API_KEY` (none in env/`.env.local`).
- Live VPS data — needs prod agent-bridge reachability (infra call:
  rebind+firewall vs Traefik expose). Mock keeps prod up until decided.
- Phase 3b live exec/pty terminal — depends on the same prod reachability.

---

## 2026-05-29 — Phase 4: Full app suite (DONE)

Maximized the os-rr app set — every prototype app now exists as a best-practice
rr slice (re-authored from `mock-os/`, not copied). 8 new app slices built by
parallel agents, each shadcn + theme tokens + ≤200 lines/file + metadata trio,
self-contained mock data (data layer wires later via OsApi):

- `code-editor` — gutter + overlay textarea + regex syntax highlight; fs.read/write.
- `media-studio` — tool rail + canvas (live CSS filters) + adjust/layers panel.
- `reel-editor` — multi-track timeline, playhead, transport, clip props, mock render.
- `browser` — omnibar + tabs + sandboxed iframe.
- `media-viewer` — image (zoom)/video/pdf preview, offline data-URI samples (noDock).
- `app-store` — catalog grid, search, category filter, install toggle.
- `create-app` — manifest form (name/runtime/accent/desc) + live icon preview.
- `assistant` — "Alfa" chat UI, streaming local mock engine (TODO: real /api route).

Registry now mounts 12 apps (`app/os-root.tsx`). Added shadcn primitives:
textarea, slider, badge, tabs. tsc green, `next build` green.

Backlog: real AI (Anthropic via /api/assistant), live data for these apps once
the prod agent bridge is decided, Spotlight ⌘K command palette.

---

## 2026-05-29 — Phase 3: Live host bridge (CODE DONE, locally verified)

Wired OsApi `live` mode to the real Control Room host agent — securely.

Design: browser → **same-origin `/api/v1` route handlers** (Convex-auth-gated)
→ host agent with `x-control-room-secret`. The agent stays loopback-private; its
gateway secret is server-only env (`OS_AGENT_SECRET`), never in the browser.

- [x] Studied the agent auth guard (`vps-rahmanef/agent/src/terminal/auth.ts`):
      JSON API gated by `x-control-room-secret` (timing-safe), pty WS by HMAC
      `session` cookie, binds 127.0.0.1:4001, fail-closed (<32-char secret).
- [x] `convex/me.ts` `getMe` — server-side session verification probe.
- [x] `lib/agent/server.ts` — `agentFetch` (adds secret) + `verifyAuth`.
- [x] Route handlers: `/api/v1/sys/stats` (→ agent `/health` telemetry),
      `/api/v1/fs/list` (→ agent `/fs/list`), `/api/v1/sys/processes` (→ `[]`).
- [x] OsApi live mode → same-origin base + Convex Bearer token (`useAuthToken`).
- [x] **Local e2e verified** vs the running agent: no-token→401; with token→real
      cpu/mem/disk telemetry + real `/home/rahman` listing.
- [ ] **PROD reachability** — Dokploy container can't reach the loopback agent;
      needs an infra decision (rebind+firewall, or Traefik expose). NOT done
      unilaterally — prod live mode returns 501 until decided; mock keeps prod up.
- Deferred Phase 3b: live `exec`/pty terminal (agent `/terminals` + `/ws/terminals`).

---

## 2026-05-29 — Phase 2: Auth & Convex persistence (DONE)

Made the deployed Convex backend real — OS gated behind `@convex-dev/auth`,
window layout persisted per-user to `features/windows`. (Re-sequenced after the
Phase 3 deploy; auth is the prerequisite for any Convex-backed UI.)

- [x] Self-hosted auth keys set on backend: JWT_PRIVATE_KEY + JWKS (RS256, via
      `sc-convex/set-auth-env.js` REST — avoids the CLI `--` PEM bug) +
      SUPER_ADMIN_EMAIL. CONVEX_SITE_ORIGIN/CLOUD_ORIGIN already container-level.
- [x] PBKDF2 password hashing in `convex/auth.ts` (Scrypt times out behind the
      Dokploy proxy → "connection lost").
- [x] `auth:*` actions routed via `ConvexHttpClient` (WS reconnect mid-flight
      aborts in-flight actions) — `app/ConvexClientProvider.tsx`. Switched from
      the nextjs server provider to `@convex-dev/auth/react` ConvexAuthProvider.
- [x] `convex/_generated` committed (un-gitignored) — frontend imports typed
      api; Docker build has it (no codegen in image).
- [x] `auth` slice: Password sign-in/up `LoginScreen` + `AuthGate`
      (Authenticated/Unauthenticated/AuthLoading). Log Out in the menu bar.
- [x] `os-shell` layout persistence → Convex `windows.getLayout`/`saveLayout`
      (localStorage instant cache, Convex authoritative, debounced).
- [x] tsc green (now incl. convex), `next build` green, shipped.

Note: backend env keys (JWT_PRIVATE_KEY/JWKS) are stored on the Convex
deployment only — NOT in the repo. Rotating = re-issue all sessions.

---

## 2026-05-29 — Phase 3: Ship (DONE)

Live: https://os.rahmanef.com + Convex self-hosted https://api-os.rahmanef.com
(+ site-os / dash-os), all HTTP 200. Repo `git@github.com:rahmanef63/os-vps.git`.

- Canonical `si-coder deploy.js`: GitHub repo + push, Dokploy project/app
  `os-vps` + compose `os-vps-db` (Convex template), admin-key gen, schema push
  (auth + windows + systemMonitor indexes), Hostinger DNS (os/api-os/site-os/
  dash-os), frontend build → `done`.
- pnpm Dockerfile (`ARG NEXT_PUBLIC_CONVEX_URL` build-arg inlining).
- Disabled `cacheComponents` (dynamic app; was blocking prerender on auth cookie).
- `next lint` removed in Next 16 → placeholder; typecheck is the CI gate.
- sc-git pre-push hook installed → `convex/` pushes auto-deploy.
- Admin key in gitignored `.env.local`.

---

## 2026-05-29 — Phase 1: Design reconcile (DONE)

Adopted the `mock-os` (os-rr) macOS-style design, re-authored into rr slices.

- globals.css → os-rr glass tokens (light/dark, accent, 5 wallpapers, traffic
  lights). `lib/appearance` (theme/accent/dir/wallpaper/server cfg).
- `lib/os-api` — the VPS boundary: MockAdapter ↔ HttpAdapter (os-rr Cloud API
  contract). Convex = auth/persistence; OsApi = host hot path.
- os-shell rebuilt: menu bar (live sys stat), glass dock, traffic-light windows
  + edge-snap/maximize, launcher, wallpaper, mobile shell.
- Apps: system-monitor + os-terminal rewired to OsApi; new files-manager +
  os-settings. Default light/aqua/aurora.

---

## 2026-05-29 — Phase 0: Foundation (DONE)

rr-conventional scaffold (Next 16 + React 19 + Tailwind 4 + Convex self-hosted
+ @convex-dev/auth). os-shell window manager, system-monitor, os-terminal;
Convex features windows + systemMonitor. Docs + mock/ placeholder. tsc green.
