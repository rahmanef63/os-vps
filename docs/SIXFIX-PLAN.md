# os-vps — 6-item fix plan (2026-07-15)

Grounded by a 6-agent triage against live code (all high-confidence). Safety invariant on every item:
**no regression to android / windows / dashboard / macos shells** — shells branch on `useActiveShell().id`, never `surface`.

Legend: ☐ todo · ◐ in progress · ☑ done · effort S/M/L

---

## 1 ☑ Widget container ≠ window container — **elevation gap** · S
Widgets are chrome-less **by design** (glanceable wallpaper cards, Apple/Win11 style — no titlebar/resize is intentional). Real gap: widgets sit flat, windows float. Missing `--shadow-win`-style elevation; border/radius hardcoded instead of shell tokens.
- **Fix (A, ship):** add a desktop-only `drop-shadow` to the widget wrapper. `filter drop-shadow` (not `box-shadow`) so it follows the inner Card's rounded alpha.
  - `frontend/slices/appshell/features/widgets/components/desktop-widgets.tsx:93` — wrapper className
  - `app/globals.css` — add `--shadow-widget` token (near `--shadow-win` @81/151)
- **Opt-in (B, needs sign-off):** also swap Card `border-white/15 → border-border`, `rounded-2xl → rounded-[var(--shell-radius-win)]` at `widget-cards.tsx:18` — but Card is **shared with mobile Today**, so this restyles android/iOS. Deferred unless requested.
- Reaches macOS via `desktop.tsx:184`, Windows via `windows-shell.tsx:74`; mobile unaffected.

## 2 ☑ Files drop-overlay stuck after upload · S
Inner `dnd.onDrop` calls `e.stopPropagation()` (`use-dnd.ts:55`, correct for upload routing) → the window-level `onDrop` that clears `dragActive` never fires → overlay stuck (pointer-events-none, so interaction leaks through).
- **Fix:** decouple the reset — add a capture-phase `onDropCapture={() => setDragActive(false)}` on the root div (runs top-down before any `stopPropagation`). Leave bubble `onDrop` + `stopPropagation` untouched.
  - `frontend/slices/files-manager/hooks/use-window-drop.ts:9-25` — add `onDropCapture`
  - `frontend/slices/files-manager/app.tsx:70-79` — wire it on root `<div>`

## 3 ☑ Window drag glitch on drop · S
Live move uses `transform`; `left/top` stay frozen. On pointerup, clearing transform reverts to origin while re-armed `.win-geo` transition (`globals.css:410`, 250ms) animates `left/top` old→new → **snap-back-then-glide**. (Resize path doesn't glitch — it writes live geometry.)
- **Fix:** in the move branch of `up`, bake delta into inline `left/top` + clear transform **same frame** while transition off, re-arm `.win-geo` next rAF. `moveWindow` commits identical numbers → React re-render is a no-op → no glide.
  - `frontend/slices/appshell/hooks/use-window-drag.ts:56-64`
- Desktop-only (macos+windows use `useWindowDrag`); mobile/dashboard don't.

## 4 ☑ Files search button + Finder type-ahead · M
Not implemented (no search/query/typeahead anywhere). Single keydown funnel `cmd.onKey` ignores printable chars.
- **Search:** `query` state in `app.tsx`; `visible = query ? ordered.filter(name includes q) : ordered`; pass `visible` to FileView. Search `<Input>` as one shared toggled row in `files-chrome.tsx` (between toolbar & UploadBar), toggled by a Search icon-button added to **both** toolbar branches.
- **Type-ahead:** new `use-typeahead.ts` (~30 LOC: ref buffer + 600ms idle timer, `startsWith` over `visible`, bail on modifiers/editable targets). Compose into root `onKeyDown`. On match → `sel.selectOne(name)` + `scrollIntoView` via new `data-name` attr on FileItem.
  - `app.tsx:42-68,74,104-122,142-146` · `hooks/use-typeahead.ts` (NEW) · `components/files-chrome.tsx:18-60` · `components/files-toolbar.tsx:46-98,99-190` · `components/file-item.tsx:98-113,162-176`
- Client-side, current-folder only (no backend). Caveat: >200-entry virtualized list won't auto-scroll to off-screen match (selection still updates).

## 5 ☑ Delete flaky + "Open with Claude Code" on folders · M
- **(a) Delete flaky:** `~/.Trash` doesn't exist on live host → `fs.move` into it throws ENOENT (`paths.ts:151` realpath of dest parent) → swallowed into a faint inline error. Mock seeds `/.Trash` so it "sometimes" works.
  - **Fix:** `await api.fs.mkdir(TRASH_PATH)` at start of `trash()` — `frontend/slices/files-manager/hooks/use-file-ops.ts:105` (idempotent recursive mkdir).
- **(b) Open with Claude Code (dir only):** launch the existing Claude Code app with a per-folder `cd '<abs>' && claude --dangerously-skip-permissions` ("langsung trus foldernya").
  - `os-terminal/claude-code.tsx:9-11` — read `payload.cwd`, build initialCommand
  - `files-manager/hooks/use-file-commands.ts:41-51` — `openInClaudeCode(entry)` → `openWindow("claude-code", name, undefined, {cwd}, {multi:true})`
  - `files-manager/components/file-context-menu.tsx:102-136` — dir-gated menu row
  - `files-manager/app.tsx` — wire `onOpenClaudeCode`
  - **Path caveat:** `fs.path` is `~`-relative; must expand `~`→Home (from `fs.roots`) before single-quoting, else `cd '~/x'` fails.

## 6 ☑ Enable OpenAI in Alfa (BYOK) · M
Registry already wires openai + ~30 OpenAI-compatible providers (`lib/models/registry.js`); only `protocol:"anthropic"` is unfenced. `route.ts:106-107` 501-fences the rest because it streams via the Anthropic SDK.
- **OAuth verdict:** OpenAI **Platform API** (`/v1/chat/completions`) is **BYOK-key-only** — no OAuth mints `/v1` creds. The only "OpenAI OAuth" is the ChatGPT-**consumer** device-auth (Codex backend, unofficial/ToS-gray, NOT `/v1`) → separate large/fragile effort, **not** built here. "Use GPT in Alfa" = BYOK + adapter below.
- **Slice 2 — streaming adapter (NEW `lib/ai/openai-stream.ts`):** `fetch {baseUrl}/chat/completions {stream:true}`, parse `choices[].delta` → emit `delta`; accumulate `tool_calls[]` by index → emit `tool_use`+`done`; translate tools & messages both ways. Remove the `route.ts:106-107` fence, branch on `resolved.protocol`. Client speaks provider-neutral `delta|tool_use|done|error` → zero client changes.
- **Slice 3 — provider picker:** `app/api/models/route.ts` (NEW, `listModels()`); `ai-section.tsx` provider `<Select>` + dynamic model list; send chosen provider (not hardcoded anthropic). `config/route.ts` + `store.ts` already per-provider — no change.
- 0 new npm deps (native fetch + SSE parse). One adapter unit test (fragment accumulation).

---

### Status — ALL SHIPPED + VERIFIED (2026-07-15, deployed to :4005)
- **1** widget elevation — `drop-shadow` on the desktop widget wrapper; class live on the wrapper (screenshot: CPU/Memory/Storage cards now float). ✅
- **2** drop-overlay — capture-phase `onDropCapture` clears `dragActive` before inner `stopPropagation`; typecheck. Logic-verified only: a synthetic `DragEvent` can't populate `dataTransfer.types` with `"Files"`, so Playwright can't fabricate a trusted OS file-drag to exercise it end-to-end. ✅
- **3** window drag — atomic transform→inline left/top handoff, `.win-geo` transition re-armed next rAF. **VERIFIED live**: dragged the Files window +140/+90 and read its rect immediately on mouseup → landed exactly at target, NOT at origin (the precise fixed-vs-buggy discriminator; the old bug reads ~origin then glides). ✅
- **4** search + type-ahead — VERIFIED live: search filter 83→39 rows on "a"; type-ahead jumped selection to `actions-runner-…`. ✅
- **5a** delete — `mkdir(~/.Trash)` before the move (idempotent). **DEFINITIVELY VERIFIED live**: `~/.Trash` was *absent* on the host (`trashExistedBefore:false`), yet Move-to-Trash created it and the folder moved (`movedToTrash:true`) — the exact silent-ENOENT bug, reproduced-as-absent then proven fixed. ✅
- **5b** Open with Claude Code — VERIFIED live: dir-only context row on folder `.9router`; opens a fresh PTY `cd "$HOME"'…' && claude --dangerously-skip-permissions`. ✅
- **6** OpenAI BYOK — VERIFIED live: `/api/models?provider=openai` → 56 models; picker lists 8 providers incl. OpenAI; openai-protocol adapter unit-tested (2/2). OAuth-for-`/v1` clarified as non-existent. ✅

Gates: `pnpm typecheck` clean · `vitest openai-stream` 2/2 · `eslint` clean · `pnpm build` + `systemctl restart os-vps` · Playwright live checks. **Not done (opt-in):** widget token-parity to mobile Today (§1 option B — touches android/iOS), ChatGPT-subscription login.
