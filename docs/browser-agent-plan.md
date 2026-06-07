# Browser-agent capability — plan (revised)

> Goal: an AI agent on the VPS drives any webapp like a human operator — open,
> login, click, fill, submit CRUD, read result, verify — **without** building a
> per-app API. The browser is a sidecar service; webapps are viewers/controllers.

This revises the original 4-repo 5W1H plan after auditing the live code. Two
premises in the original plan were wrong and are fixed here. Phase 0 (the os-vps
runtime foundation) is **already implemented** in this repo — see "Status".

---

## Security model (the one rule that shapes everything)

The os-browser runtime (`os-browser/server.mjs`, `127.0.0.1:4002`) is a REAL
browser on the host. An `http(s)` target it loads CAN reach LAN/metadata
(`http://127.0.0.1:*`, Dokploy admin, Traefik, Convex) — that is inherent to a
real browser and is **not** fixable with a URL allowlist alone. So the security
boundary is:

1. The runtime binds **loopback only** + a shared secret; the port is never public.
2. The **only** front door is **os-vps**, which checks a signed-cookie session
   (or an agent token) and writes an audit line **before** forwarding.
3. Therefore: **no other app may hold `OS_BROWSER_SECRET` or forward to :4002.**

### Why the original Step 1 was unsafe (confirmed)

The original plan put a `/api/browser/*` relay in **app-rahmanef** that forwards
to the runtime with the secret. app-rahmanef is the **public, no-auth demo**
(`os-vps-demo`). A relay there = an open SSRF gateway into the VPS internal
network. **Fix:** app-rahmanef stays viewer/UX only, backed by a **mock
adapter** — zero path to the runtime. Only os-vps (and, via os-vps, the
control-room agent) touches the real runtime.

### Why the runtime stays in os-vps (not resource-site)

The original plan moved the runtime into `resource-site/packages/*`. But
resource-site is **not** a workspaces monorepo (`"workspaces": null`) and does
not host the systemd unit. The runtime lives where its service runs: **os-vps**.
resource-site's role shrinks to the **extension + protocol spec** (docs/templates,
which fits its slice/validate ecosystem), not the running service.

---

## Repos & roles (revised)

| Repo | Role |
|------|------|
| **os-vps** | Hosts the runtime (`os-browser/`) + the authed/audited API + viewer + Settings. The single auth boundary. **Foundation lives here.** |
| **app-rahmanef** | Viewer/UX **only**, mock adapter. Public demo — never reaches the runtime. |
| **resource-site** | Browser **extension** (DOM/form scanner) + **protocol spec** as reusable templates/docs. No running service. |
| **control-room** | Agent CRUD tools that call **os-vps `/api/v1/browser/*`** with `x-os-agent-token` — never the runtime directly, never `OS_BROWSER_SECRET`. |

---

## Status — what already exists in os-vps (audited 2026-06-07)

Implemented + live (`os-browser.service` on `127.0.0.1:4002`, `os-vps.service` :4005):

- Sidecar Playwright Chromium, persistent profile (`~/.os-vps/chrome-profile`),
  constant-time secret, one-page serialized action queue, `/health`.
- 11 API routes `/api/v1/browser/*` (navigate/click/type/key/scroll/back/forward/
  reload/screenshot/state/content), each `verifyAuth` (session) first.
- Shared secret server-side only (`lib/agent/server.ts`); never sent to client.
- Audit log of mutating actions → `~/.os-vps/audit.log` (JSONL).
- `http(s)`-only scheme block on navigate; loopback bind is the boundary.

Added in this change set (Phase 0 completion):

- **Runtime**: JPEG screenshot (`/screenshot?type=jpeg&q=`), idle reset
  (`OS_BROWSER_IDLE_MS`), `/elements` (structured interactive-element scan +
  stable selector candidates), `/fill` (by selector), `/click-selector`, `/info`
  (status), env-gated unpacked-extension load (`OS_BROWSER_EXTENSION_DIR`,
  headed+Xvfb), configurable viewport.
- **API**: `/api/v1/browser/{elements,fill,click-selector,info}` (authed + audited).
- **Agent token**: `OS_AGENT_TOKEN` → callers send `x-os-agent-token`; verified
  in `lib/agent/server.ts` alongside the session cookie. Lets control-room drive
  the browser through os-vps without the runtime secret/port.
- **Settings → Browser**: read-only runtime status panel.

Still open (tracked, not in this change set):

- Multi-consumer page contention policy (agent + human share ONE page/profile —
  currently serialized only). Decide: per-consumer context, or lock + queue.
- JPEG adoption in the viewer poll (UI still requests PNG).
- structured-DOM extension actually built (resource-site Phase 2).

---

## Phases

### Phase 0 — os-vps runtime foundation — **DONE (this change set)**
Acceptance: `pnpm build` green; `curl :4002/info` (with secret) returns status;
`/api/v1/browser/elements` returns selectors; agent token gates a no-cookie call.

### Phase 1 — app-rahmanef viewer (mock only) — **DONE (529c4f2)**
Added `components/apps/BrowserApp.tsx` (mock viewer: omnibar, nav, detected-
elements inspector, action log) + catalog entry. Pure client state, **no** API
route reaching a runtime. Build green; `grep "4002|OS_BROWSER_SECRET"` clean.

### Phase 2 — resource-site extension + protocol spec — **DONE (e2126548)**
`packages/browser-protocol` (shared types + `actionToRequest()`, the runtime/
extension/agent contract) + `packages/browser-extension` (MV3: scanner +
content-script + page-bridge + background, output = `/elements` shape). Both
excluded from root build (`tsconfig exclude packages/**`), typechecked
standalone. Runtime opt-in-loads via `OS_BROWSER_EXTENSION_DIR` (headed + Xvfb).

### Phase 3 — control-room agent CRUD — **DONE (10c3cc7)**
`agent/src/browser/{client,crud,http}.ts` wraps os-vps `/api/v1/browser/*` with
`x-os-agent-token` (from `OS_AGENT_TOKEN`). BrowserClient: navigate, screenshot,
readDom (`/elements`+`/content`), click, clickSelector, fill, type, key, scroll,
wait, assertText. `runCrudFlow` is logged + recovers a bad click by re-scanning
`/elements`. Eval green (4/4 unit; live CRUD env-gated). control-room never holds
`OS_BROWSER_SECRET`; os-vps audits agent actions as actor `agent`.

### Phase 4 — os-vps final polish
- **Per-consumer tabs — DONE (649bde9).** One persistent context, one tab per
  consumer (`ui` = session, `agent` = agent-token), forwarded as
  `x-os-browser-consumer`. Agent + human no longer collide; login/profile shared.
  Bounded by `OS_BROWSER_MAX_PAGES` (LRU-evict) + idle reaper. Verified live.
- **Dashboard CRUD console — DONE (control-room 2f84cdf).** `/browser` page +
  `app/api/browser/crud` proxy drive the agent from the UI.
- **Extension headed+Xvfb — proven in isolation (resource-site).** Built with
  esbuild (`npm run build` → flat `dist/`), loaded into a headed Chromium under
  `xvfb-run` on a throwaway port: `/info` reported `headless:false` + the
  extension path, navigate + scan worked. **Prod stays headless** (the runtime
  already scans the DOM via `/elements`, so the extension adds ~no capability
  today and headed is heavier/flakier). Flip runbook below.
- **Viewer JPEG + heartbeat — DONE (b2b7c02).** The Browser app polled full-page
  PNGs and froze after the 6s settle burst. Now the viewer requests JPEG
  (screenshot route forwards `?type=jpeg&q` + echoes content-type) and a 2s
  heartbeat (paused when hidden) keeps it live. ~2–10× smaller frames.
- **Viewer CDP screencast — IN PROGRESS.** Polling is lighter now but never
  video-smooth. Adding `Page.startScreencast` (CDP) per consumer → an MJPEG
  `multipart/x-mixed-replace` stream the viewer renders in a native `<img>`.
  Event-driven (frames only on visual change) so it's smoother AND lighter than
  fixed polling; lazy (only runs while a client watches). Poll stays as fallback.
- Still open: Settings start/stop/restart (needs a safe systemd hook).

#### Extension flip runbook (reversible)
```
# 1. build the extension (resource-site)
cd packages/browser-extension && npm i && npm run build   # → dist/

# 2. point the runtime at it + go headed, then restart under Xvfb
#    os-browser.service: wrap ExecStart in `xvfb-run -a` and set:
#      OS_BROWSER_HEADLESS=0
#      OS_BROWSER_EXTENSION_DIR=/abs/path/to/dist
sudo systemctl daemon-reload && sudo systemctl restart os-browser.service

# 3. health-check; rollback on any failure
curl -s -H "x-os-browser-secret: $SEC" 127.0.0.1:4002/info   # headless:false, extension set
#    rollback: unset the two envs + drop xvfb-run + restart → back to headless
```

---

## Acceptance criteria (program)

1. app-rahmanef shows a browser viewer (mock); no path to the runtime.
2. resource-site has a reusable extension + protocol spec.
3. control-room agent does CRUD against app-rahmanef via os-vps, no app API.
4. os-vps hosts the runtime; only it (and agent-token callers via it) drive :4002.
5. Browser crash never takes down os-vps (separate systemd unit).
6. Runtime restarts via systemd; login/profile persists.
7. Agent reads pages (`/elements`,`/content`) + acts by selector.
8. Every mutating action audited with actor + target.
9. No secret reaches any client; `OS_BROWSER_SECRET` only in os-vps.
10. control-room never holds `OS_BROWSER_SECRET`; uses `OS_AGENT_TOKEN`.

## Risks (revised)

- ~~VPS RAM small~~ — host has 31 GB/8 cores; idle-reset + JPEG are hygiene, not
  blockers. Real risks below.
- **Shared page/profile** — agent + human contend on ONE page and ONE login
  profile. Mitigate: serialized queue (now) → per-consumer context (Phase 4);
  decide login-isolation policy.
- **Chromium crash** — separate systemd unit + `/health`; `Restart=on-failure`.
- **Wrong click** — `/elements` selectors + screenshot verify; re-scan on miss.
- **Extension in headless** — needs headed + Xvfb; keep env-gated, default off.
- **Security** — loopback + secret + os-vps session/agent-token + audit. Never
  relay from an unauthenticated app (the app-rahmanef fix).

---

## Ready-to-paste agent prompts

### Phase 1 — app-rahmanef
```
Repo: app-rahmanef (PUBLIC demo, no auth). Add a Browser viewer app, UX ONLY.
HARD RULE: no API route may forward to a browser runtime; no OS_BROWSER_SECRET;
nothing may reach 127.0.0.1:4002. Back the viewer with a MOCK adapter (mirror the
os-vps lib/os-api/mock-adapter.ts pattern): omnibar + navigate + screenshot stub +
click/type/scroll handlers, all pure client state. Ensure `pnpm build` is green and
`grep -rn "4002\|OS_BROWSER_SECRET" .` returns nothing.
```

### Phase 2 — resource-site
```
Repo: resource-site (NOT a workspaces monorepo; do not assume one). Create
packages/browser-extension (manifest v3 + content-script DOM/form/interactive
scanner + page bridge) and packages/browser-protocol (request/response shapes)
as REUSABLE TEMPLATES + docs — there is NO running service here. The scanner's
output must match the os-vps /elements shape: {tag,type,role,text,href,selector,box}.
Do not move the runtime here. Run the repo's validate tooling and keep it green.
```

### Phase 3 — control-room
```
Repo: control-room. Build agent CRUD browser tools that call os-vps
/api/v1/browser/* with header `x-os-agent-token: $OS_AGENT_TOKEN`. NEVER use
OS_BROWSER_SECRET and NEVER hit :4002 directly — os-vps is the only door. Tools:
navigate, screenshot, readDom (/elements + /content), click, clickSelector, fill,
type, key, scroll, wait, assertText. Add a CRUD eval against app-rahmanef done
entirely through the browser UI (no app API), with recovery (re-scan /elements on
a failed click) and a per-action log. Keep agent/frontend/cli builds green.
```
