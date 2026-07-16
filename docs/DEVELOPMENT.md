# Development

## Setup

```bash
git clone git@github.com:rahmanef63/os-vps.git && cd os-vps
corepack enable pnpm      # uses the pinned pnpm (see "pnpm version" below)
pnpm install
cp .env.example .env.local   # set OS_LOGIN_PASSWORD + OS_SESSION_SECRET (openssl rand -hex 32)
pnpm dev                     # http://localhost:3000
node scripts/approve-device.js <deviceId> "my laptop"   # deviceId shows on the login screen
```

## Layout

Every feature is a self-contained **vertical slice** under `frontend/slices/<slug>/`
(its own components, hooks, and a `lib/host.ts` seam for host I/O). One manifest,
`frontend/slices/os-shell/shell.manifest.ts`, wires slices into the shell — so
**adding an app = one slice + one manifest entry**. Host access is bounded in
`lib/host` (Node `fs`/`child_process`, filesystem-jailed) behind signed-cookie auth
(`lib/auth`). See [ARCHITECTURE.md](./ARCHITECTURE.md).

## Quality gates

```bash
pnpm verify   # typecheck + lint + test + check (cycles / slices / contrast)
```

A **pre-push hook** runs the same CI locally and blocks the push on failure. None of
these touch `.next`, so they're safe to run against the prod checkout.

## Deploy — and the build hazard ⚠️

os-vps deploys via **systemd on the VPS**, not `git push` (no webhook, no Dokploy/
Vercel). A deploy is:

```bash
pnpm build && sudo systemctl restart os-vps.service   # build THEN restart, in that order
```

**Never run `pnpm build` inside the running prod checkout just to "verify" a change.**
`next start` loads the build manifest at boot; overwriting `.next` under the live
process makes the already-served HTML reference chunk hashes that no longer exist on
disk → every JS/CSS chunk 404/500s → **the live site is broken until you restart**.

To test runtime behaviour without risking prod, use a **separate checkout / a demo
instance** on a different port — e.g. a build with `NEXT_PUBLIC_OS_DEMO=1` (no login,
no host access, forced mock data), served on `:4006` via its own systemd unit. For a
non-destructive static check, `pnpm typecheck && pnpm lint` is the cheap gate.

Recovery if a chunk mismatch is live: `sudo systemctl restart os-vps.service`.

## pnpm version

pnpm is **pinned to `10.32.1`** via `package.json` → `packageManager` (corepack honors
it in-project). Do **not** unpin: **pnpm 11 stopped reading `pnpm.onlyBuiltDependencies`
and `pnpm.overrides` from `package.json`** (they moved to `pnpm-workspace.yaml`). On
pnpm 11 that means `node-pty` is left uncompiled (`next build` → `next: not found`) and
the committed lockfile's `overrides` mismatch (`--frozen-lockfile` fails). To move to
pnpm 11, first migrate those two settings into `pnpm-workspace.yaml` and regenerate the
lockfile.
