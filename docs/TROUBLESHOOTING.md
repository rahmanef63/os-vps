# Troubleshooting

Symptoms → causes → fixes. Errors are quoted as the UI/logs print them.

## Login & sessions

### Login returns `not_configured` (HTTP 500)

`OS_SESSION_SECRET` is missing/shorter than 32 bytes, or `OS_LOGIN_PASSWORD`
is shorter than 6 chars. The app **fails closed** on weak config. Fix
`.env.local` (`openssl rand -hex 32` for the secret) and restart.

### "Too many attempts, try again later" (HTTP 429)

Per-IP login rate limit tripped. Wait for the window to pass (minutes, not
hours) and try again. Behind a reverse proxy, make sure it forwards
`X-Forwarded-For` — otherwise every user shares the proxy's IP and one
person's typos rate-limit everyone.

### Logged in but stuck "pending approval"

Working as designed: a correct password only creates a *pending* device.
Approve it from an already-approved device (Settings → Devices) or from the
server: `node scripts/approve-device.js <deviceId> "label"` — the id is shown
on that browser's login screen.

### Login succeeds but I'm immediately logged out (no session)

The session cookie is `Secure` — over plain HTTP the browser **silently drops
it**. Serve the app over HTTPS (reverse proxy with TLS, or Tailscale HTTPS).
TLS is mandatory even inside a VPN.

### Session drops sooner than expected

Default lifetime is 24h (`SESSION_EXPIRY_HOURS`). Changing
`OS_SESSION_SECRET` (or restarting with a different one) invalidates ALL
sessions immediately — check you're not regenerating it on every deploy.

## Deploy & build

### UI is unstyled/broken after a deploy

Chunk mismatch: `next start` loaded one build's manifest but `.next/static`
on disk is from another. Browser console shows CSS/JS 404s or a wrong-MIME
refusal (`X-Content-Type-Options: nosniff` makes that fatal on purpose).

**Rule: build, THEN restart — never restart then rebuild.** If already
mismatched:

```bash
rm -rf .next && pnpm build && sudo systemctl restart os-vps.service
```

### Build runs out of memory ("Ineffective mark-compacts near heap limit")

The Next build wants ~2 GB+. Give Node more heap and/or add swap:

```bash
NODE_OPTIONS=--max-old-space-size=4096 pnpm build
```

### "Another next build process is already running"

Usually a stale lock from a killed build: `rm -f .next/lock` and rebuild.
First confirm nothing is actually building: `ps -eo pid,args | grep "[.]bin/next build"`.

### A brand-new route/page 404s after deploy

Incremental builds occasionally miss a new `app/**/route.ts`/page folder.
Clean rebuild: `rm -rf .next && pnpm build`, restart.

### "Versi baru" (new version) toast loops or update never arrives

The service worker bakes the BUILD_ID into its cache name; a loop means the
served build keeps flip-flopping (two processes serving different builds?).
One-off fix in the browser: DevTools → Application → Service Workers →
Unregister, then hard-reload.

## Files app

### "Folder is outside the writable area (OS_FS_WRITE_ROOTS)"

You tried to create/rename/delete outside the write jail. Widen it in
`.env.local` (`OS_FS_WRITE_ROOTS=~:~/projects:/srv/data`) and restart.
Top-level system dirs are refused even if listed — keep writes narrow.

### Folder tree is empty / can't browse where I expect

Reads are bounded by `OS_FS_READ_ROOTS` (default home + `~/projects`). Set
`OS_FS_READ_ROOTS=/` for read-only browsing of the whole box. Also remember
the process user's own permissions still apply — os-vps can't read what
`youruser` can't.

### "Access to os-vps credential files is blocked"

By design: the FS API refuses the app's own `.env*` files and everything
under `~/.os-vps/` (device allowlist, BYOK key, audit log, browser profile),
even inside a legal read/write root — otherwise one stolen session could read
`OS_SESSION_SECRET` and forge cookies forever. Edit those files over SSH.

### Mutating API call returns `cross_origin_blocked` (HTTP 403)

`proxy.ts` rejects mutating `/api` requests whose `Sec-Fetch-Site`/`Origin`
isn't same-origin (CSRF depth-2). Hitting the API from another web page won't
work by design; scripts/curl without browser headers pass normally.

### Upload fails on big files

Request body is capped at 500 MB. Move bigger files with `scp`/`rsync`.

## Terminal / exec

### Command refused by the destructive-command guard

`rm -rf /`, `mkfs`, `dd` to a block device, fork bombs, recursive
`chmod/chown` on `/` etc. are refused. Do real disk surgery over SSH, or (not
recommended) set `OS_EXEC_ALLOW_DESTRUCTIVE=1`.

### Command output cut off / command killed after a while

One-shot exec has a 30 s timeout and a 1 MiB output cap. Long jobs: run them
detached (`nohup … &`, `tmux`) and tail the log file instead.

## Browser app

### Browser app shows as disabled / errors immediately

`OS_BROWSER_URL`/`OS_BROWSER_SECRET` unset in `.env.local`, or the
`os-browser` service isn't running. Check `journalctl -u os-browser -f`.

### os-browser refuses to start: "OS_BROWSER_SECRET missing/short (>=16)"

Exactly that — give it a real secret (`openssl rand -hex 16`) and use the
same value in the main app's `.env.local`.

### Chromium fails to launch on a fresh box

Missing system deps: `npx playwright install chromium --with-deps` (needs
sudo once for the deps).

## Assistant (AI)

### Assistant returns 501

No API key. Set `ANTHROPIC_API_KEY` in `.env.local` or paste a key under
Settings → AI (stored in `~/.os-vps/config.json`). It's BYOK — without a key
the endpoint stays off and everything else works.

## Service & networking

### Port already in use

Another process owns :4005 (or :3000 locally). `ss -ltnp | grep 4005`, stop
the squatter or change `Environment=PORT=` in the unit.

### Works on the VPS, unreachable from outside

By design you should firewall :4005/:4002 and reach it via Tailscale or the
reverse proxy. Check the proxy is pointing at `127.0.0.1:4005` and the
firewall allows the proxy, not the app port.

### Service restarts in a loop

`journalctl -u os-vps -n 50` — most common: missing `.env.local`
(`EnvironmentFile=` path wrong), Node not at `/usr/bin` (adjust `ExecStart`),
or the build is absent (`pnpm build` never ran in that WorkingDirectory).

## Still stuck?

Check the audit log (`~/.os-vps/audit.log`) for what the server actually did,
and `journalctl -u os-vps` for stack traces. Issues/PRs welcome.
