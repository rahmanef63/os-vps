# Installing os-vps (Manef Shell OS) on your VPS

Step-by-step setup for a server you own. For the short path, see
[Install](../README.md#install). This guide covers credentials, systemd, TLS,
the optional browser service, demo mode, updating, and rollback.

## 0. Requirements

- A Linux VPS (any distro with systemd; 1 vCPU / 2 GB RAM works, build wants
  ≥2 GB free — see [Troubleshooting](./TROUBLESHOOTING.md)).
- **Node.js 20.9+** (22 recommended) and **pnpm 10.32.1** via corepack.
- A **non-root user** that owns the install. Never run os-vps as root —
  an authenticated session can run shell commands as the process user.
- Optional: a domain + reverse proxy (Caddy/nginx/Traefik) **or** Tailscale.

## 1. Clone + install

```bash
# as your normal user (NOT root)
git clone https://github.com/<you>/os-vps.git ~/os-vps
cd ~/os-vps
pnpm install
```

## 2. Credentials — read this section carefully

os-vps is single-owner. A password, signed session cookie, and device allowlist
gate owner access. All of it lives in two places:

| What | Where | Committed? |
|---|---|---|
| Secrets/env | `.env.local` | **NEVER** (gitignored) |
| Device allowlist, BYOK AI key, audit log | `~/.os-vps/*.json`, `~/.os-vps/audit.log` | outside the repo |

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Owner password (min 6 chars). Use a strong password for any exposed host.
OS_LOGIN_PASSWORD=pick-something-strong

# The HMAC key that signs session cookies. MUST be strong and random:
OS_SESSION_SECRET=$(openssl rand -hex 32)   # paste the output, don't keep the $( )
```

**Device approval.** The first time a browser logs in with the right password
it does NOT get a session — it lands *pending*. Promote it once, from the
server. This is a local browser allowlist, not standards-based 2FA:

```bash
# the device id is shown on that browser's login screen
node scripts/approve-device.js <deviceId> "rahman's phone"
```

After you have one approved device, you can approve new ones from the UI
(Settings → Devices) instead of SSH. The allowlist is a plain JSON file at
`~/.os-vps/auth-devices.json` — deleting an entry revokes that device.

**Filesystem bounds.** Reads and writes are jailed to configured roots
(default: `~` + `~/projects`, realpath-checked so symlinks can't escape):

```bash
# widen reads to the whole box (read-only browsing), keep writes narrow:
OS_FS_READ_ROOTS=/
OS_FS_WRITE_ROOTS=~:~/projects

# narrow reads to projects only (hides the rest of $HOME entirely):
OS_FS_READ_ROOTS=~/projects
```

Even inside legal roots, credential material is always blocked: `~/.os-vps`,
the app's own `.env*`, and the sensitive-home denylist (`~/.ssh`, `~/.gnupg`,
`~/.secrets`, `~/vault`, `~/.bash_history`, `~/.npmrc`) — those paths are
unreadable AND hidden from listings. Escape hatch for a supervised session:
`OS_FS_ALLOW_SENSITIVE=1`.

**Rotation.** To rotate the session secret just change `OS_SESSION_SECRET`
and restart — every session is invalidated, approved devices stay approved.
To rotate the password change `OS_LOGIN_PASSWORD`; pending devices reset on
their next attempt.

**Checklist before going live** (same as the README security checklist):
strong `OS_SESSION_SECRET`, VPN/TLS in front, tight read roots, non-root
user, `.env.local` never committed, review `~/.os-vps/audit.log`.

## 3. First run

```bash
pnpm build
pnpm start          # serves on :3000, or PORT=4005 pnpm start
```

Open it, note the device id on the login screen, approve it (step 2), log in.

## 4. Run as a systemd service

`/etc/systemd/system/os-vps.service` (adjust user + paths):

```ini
[Unit]
Description=Manef Shell OS — browser-based visual shell for a Linux server
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/home/youruser/os-vps
EnvironmentFile=/home/youruser/os-vps/.env.local
Environment=PORT=4005
Environment=HOSTNAME=0.0.0.0
ExecStart=/usr/bin/pnpm start --hostname 0.0.0.0 --port 4005
Restart=always
RestartSec=5
MemoryMax=3G
StandardOutput=journal
StandardError=journal
SyslogIdentifier=os-vps

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now os-vps.service
journalctl -u os-vps -f        # watch logs
```

`pnpm start` runs the `start` script from `package.json` (`next start`). The
project is pnpm-only — corepack is enabled in step 0 — so don't substitute
`npm`/`yarn`: lockfile drift defeats the audit trail. Verify pnpm is on PATH
where systemd looks for it (`which pnpm` → adjust `ExecStart=` accordingly,
e.g. `/usr/local/bin/pnpm` on most distros).

**Graceful shutdown**: add to the `[Service]` block:

```ini
KillSignal=SIGTERM
TimeoutStopSec=20
```

This gives 20 s for in-flight requests + PTY sessions to drain on
restart. Without it, systemd waits the default 90 s then SIGKILLs —
fine for normal use, but interactive PTY sessions get cut mid-keystroke.

## 5. Put TLS in front (pick ONE)

**Tailscale (recommended for a personal box):** don't expose anything.
`tailscale up`, then reach `http://<machine>:4005` over the tailnet, or
`tailscale serve 4005` for HTTPS. Firewall :4005 from the public net.

**Caddy (public domain):**

```caddy
os.example.com {
    reverse_proxy 127.0.0.1:4005
}
```

**nginx:** a standard `proxy_pass http://127.0.0.1:4005;` server block with
TLS (certbot). Keep `proxy_set_header Host $host;` and forward
`X-Forwarded-For` (the login rate limiter keys on client IP).

Either way: firewall :4005 (and :4002) so only the proxy / tailnet reaches them.

## 6. Optional — the remote Browser app (`os-browser/`)

A real headless Chromium on the VPS, driven by the Browser app. Skip it and
everything else still works.

```bash
cd os-browser
npm install                 # installs playwright
npx playwright install chromium --with-deps

# it refuses to start without a secret (≥16 chars):
OS_BROWSER_SECRET=$(openssl rand -hex 16) node server.mjs   # listens on 127.0.0.1:4002
```

Then in the main app's `.env.local`:

```bash
OS_BROWSER_URL=http://127.0.0.1:4002
OS_BROWSER_SECRET=<the same secret>
```

Run it under systemd too (same pattern as step 4, `ExecStart=node server.mjs`,
plus `Environment=OS_BROWSER_SECRET=...`). **Keep it on loopback** — the
secret travels server-to-server only and must never be reachable publicly.

## 7. Optional — AI assistant (BYOK)

Set `ANTHROPIC_API_KEY` in `.env.local`, **or** paste a key in the OS under
Settings → AI (stored in `~/.os-vps/config.json`, never in the repo). Unset
= the assistant endpoint returns 501 and the rest of the OS is unaffected.

## 8. Optional — public demo mode

```bash
NEXT_PUBLIC_OS_DEMO=1 pnpm build && pnpm start
```

Demo builds have **no real login, no host access, no PTY, no shell command
execution, no live host API, and no API-key storage**. They use mock data only
and show a permanent demo banner. Use a separate checkout/service for the demo;
the flag is baked at build time.

## 9. Updating

```bash
cd ~/os-vps
git status --short          # must be clean before updating
git fetch origin main
git merge --ff-only FETCH_HEAD
pnpm install --frozen-lockfile
pnpm build                  # ALWAYS build before restarting
sudo systemctl restart os-vps.service
./scripts/post-deploy-smoke.sh   # catches the chunk/MIME drift the README warns about
```

The installer follows the same rule: it shows the old and new commit, refuses
dirty worktrees, exits non-zero if the target ref cannot be fetched, builds only
after a successful update, and restarts only after a successful build.

Build **then** restart, never the reverse — `next start` loads the build
manifest at boot, and mismatched on-disk chunks cause every CSS/JS request to
404 (see [Troubleshooting](./TROUBLESHOOTING.md#ui-is-unstyledbroken-after-a-deploy)).

## 9b. Rolling back

If a deploy breaks production:

1. Find the prior good commit: `git log --oneline -10`
2. Check out the known-good commit: `git switch --detach <good-sha>`
3. Rebuild: `pnpm build`
4. Restart: `sudo systemctl restart os-vps.service`
5. Verify: `curl -s http://localhost:4005/api/health | jq .buildId`

If the build itself broke (TypeScript or compile error), leave the running
service alone, fix the checkout, and rebuild before restarting. If chunks are
404ing after restart (build/run version mismatch): stop the service, remove
`.next`, rebuild, then start it again.

## 9c. Healthcheck

`GET /api/health` returns `{status, buildId, uptime, version}` with
`Cache-Control: no-store`. Wire it into:

**systemd watchdog** (implemented + live): the production unit keeps
`Type=simple` (no readiness handshake → no startup race) plus:

```ini
[Service]
WatchdogSec=30
NotifyAccess=all
```

`instrumentation.ts` `register()` pings `WATCHDOG=1` every ~10 s via the
`systemd-notify` binary — Node has no native AF_UNIX SOCK_DGRAM, and
`NotifyAccess=all` is required because the ping comes from a child PID, not
`main`. A wedged event loop that misses the 30 s deadline → systemd
auto-restarts (catches hangs that `Restart=always`, crash-only, can't). All a
no-op when `NOTIFY_SOCKET` is unset (dev / demo / CI).

After editing the unit: `sudo systemctl daemon-reload && sudo systemctl restart os-vps.service`
Verify: `systemctl show os-vps -p WatchdogUSec,NRestarts,ActiveState`

**External monitor** (Uptime Kuma / Healthchecks.io / etc):

- URL: `https://os.rahmanef.com/api/health`
- Expected: HTTP 200 + JSON body
- Interval: 60s
- Timeout: 5s
- Alert when: `status!="ok"` OR 2 consecutive failures

**Dokploy**: configure the application healthcheck endpoint at `/api/health`.

## 9e. Backup & retention

`~/.os-vps/` is the persistence root:

- `auth-devices.json` — approved-device allowlist (losing it = re-approve every device)
- `config.json` — BYOK key + AI model preferences
- `audit.log` — append-only JSONL forensic trail
- `chrome-profile/` — Playwright user data (browser app, optional)

**Backup recommendation**: nightly `restic` (or `rsync` to off-host) of `~/.os-vps/`. ≤10MB typical.

```bash
# example: restic to S3-compatible / Backblaze B2 / local NAS
restic -r b2:my-bucket backup ~/.os-vps --tag os-vps --exclude chrome-profile
```

**Audit log rotation** (avoid unbounded growth):

```
# /etc/logrotate.d/os-vps
/home/rahman/.os-vps/audit.log {
    su rahman rahman
    size 1M
    rotate 4
    copytruncate
    compress
    delaycompress
    missingok
    notifempty
}
```

The `su` directive tells logrotate which user owns the rotated files
(required when the path lives under a non-root home). `copytruncate` is
the right choice here: the audit writer in `lib/host/audit.ts` opens the
log with each `appendFile` call, so no HUP/USR1 signal is needed to make
it reopen the fd — truncate-in-place is safe.

## 9d. Zero-downtime restart (advanced)

`systemctl restart` kills the running process then starts the new one — brief
200-500 ms gap during which `/_next/static` chunks 404 mid-flight. For higher
availability:

1. Run two instances on adjacent ports (4005 + 4006) behind a reverse proxy
   (Caddy/nginx).
2. Update systemd to a socket-activated `os-vps@.service` template.
3. Rolling restart: `systemctl restart os-vps@4006.service` first; verify
   `/api/health`; then 4005.

For a single-owner personal tool, this is overkill — the 200-500 ms gap is fine.

## 10. Uninstall

```bash
sudo systemctl disable --now os-vps.service os-browser.service 2>/dev/null
sudo rm /etc/systemd/system/os-vps.service /etc/systemd/system/os-browser.service
rm -rf ~/os-vps ~/.os-vps      # ~/.os-vps holds devices/config/audit log
```
