# Security Policy

Manef Shell OS is Public Alpha / Developer Preview software. It has not had a
third-party security audit. Only the latest commit on `main` is supported; there
are no release branches yet.

## Reporting a vulnerability

Please do not open a public issue for security vulnerabilities.

Use GitHub's private vulnerability reporting flow for this repository:

1. Open the repository on GitHub.
2. Go to **Security** → **Report a vulnerability**.
3. Include the affected version or commit, reproduction steps, impact, and any
   logs with secrets removed.

If private vulnerability reporting is unavailable, open a minimal public issue
asking the maintainer to enable private advisory intake. Do not include exploit
details, passwords, session secrets, API keys, private file contents, or full
environment files in that public issue.

## Deployment warning

An authenticated MSO session can run commands and access files as the Linux user
that owns the process. Treat it like SSH in a browser.

- Run MSO as a dedicated non-root user.
- Prefer Tailscale or another VPN for real deployments.
- If using a public domain, put HTTPS, firewall rules, and strict access control
  in front of the app.
- Do not expose the raw app port directly to the public internet.
- Do not commit `.env.local`, API keys, or data from `~/.os-vps`.
- Use demo mode (`NEXT_PUBLIC_OS_DEMO=1`) for public showcases.

## In scope

- Auth bypass: session forgery without `OS_SESSION_SECRET`, device-approval
  bypass, or rate-limit defeat that enables practical brute force.
- Filesystem jail escape: reading or writing outside `OS_FS_READ_ROOTS` /
  `OS_FS_WRITE_ROOTS`, or reaching denied credential material such as `.env*` or
  `~/.os-vps/*` through the file APIs.
- Unauthenticated access to live host routes such as `/api/v1/*`,
  `/api/assistant`, `/api/config`, or `/api/auth/devices`.
- CSRF or clickjacking that triggers host actions cross-origin.

## Out of scope

- An already-authenticated owner session doing documented owner actions such as
  running commands or accessing files within configured roots.
- Bypassing the destructive-command guard with shell tricks. It is an accident
  tripwire, not a sandbox.
- Deployments that ignore the minimum posture: non-root user, strong secrets,
  Tailscale/VPN or protected HTTPS, and narrow filesystem roots.

## Key rotation

BYOK AI credentials are stored server-side in `~/.os-vps/config.json`, never in
the client bundle. To rotate a key, stop MSO, edit the config file or remove the
provider from Settings → AI, then restart/sign in again.

To rotate auth secrets:

- Change `OS_SESSION_SECRET` and restart to invalidate sessions.
- Change `OS_LOGIN_PASSWORD` and restart to require the new password.
- Remove entries from `~/.os-vps/auth-devices.json` to revoke devices.

## Audit log retention

The JSONL audit trail defaults to `~/.os-vps/audit.log` and can grow over time.
Use logrotate or your normal host log retention system. Do not publish audit
logs without checking for private paths, command names, or other sensitive
context.
