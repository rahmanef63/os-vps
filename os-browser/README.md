# os-browser — headless Chromium service for the Browser app

A tiny HTTP wrapper around a REAL Playwright Chromium running on the VPS.
The os-vps Browser app proxies to it server-to-server, so any site renders
(no `X-Frame-Options` problem — it's a browser, not an iframe). One
persistent profile (`~/.os-vps/chrome-profile`) keeps logins across restarts.

Optional: without it, every other os-vps app still works.

## Run

```bash
npm install
npx playwright install chromium --with-deps   # system deps need sudo once

OS_BROWSER_SECRET=$(openssl rand -hex 16) node server.mjs
# listens on 127.0.0.1:4002 — it REFUSES to start without a secret (≥16 chars)
```

Then in the main app's `.env.local`:

```bash
OS_BROWSER_URL=http://127.0.0.1:4002
OS_BROWSER_SECRET=<the same secret>
```

## Env

| Var | Default | Purpose |
|---|---|---|
| `OS_BROWSER_SECRET` | — (required, ≥16) | Shared secret; never reaches the client |
| `OS_BROWSER_PORT` | `4002` | Listen port |
| `OS_BROWSER_HOST` | `127.0.0.1` | **Keep loopback.** Override only behind a private bridge |
| `OS_BROWSER_PROFILE` | `~/.os-vps/chrome-profile` | Persistent browser profile dir |

## Security

Loopback + shared secret, by design. Never expose :4002 publicly — the
service will navigate anywhere and holds logged-in sessions in its profile.
Firewall it; see [docs/INSTALL.md](../docs/INSTALL.md#6-optional--the-remote-browser-app-os-browser).
