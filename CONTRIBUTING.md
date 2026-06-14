# Contributing

Solo-maintainer project — PRs and issues welcome, scope kept deliberately small.

## Setup

```bash
pnpm install
cp .env.example .env.local   # set OS_LOGIN_PASSWORD + OS_SESSION_SECRET
pnpm dev                     # :3000, mock data by default (no host access needed)
```

Node `>=20.9` (see `.nvmrc`). The mock adapter means you can develop every app
without a VPS or any credentials.

## Before you open a PR

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

All four must be green. There is no CI — these are the gates. `pnpm test`
runs the vitest suite (unit + integration); `pnpm smoke` runs the e2e smoke
test against a local server.

## Conventions (the short version)

Full conventions live in [CLAUDE.md](./CLAUDE.md) and
[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md). The ones reviewers will hold
you to:

- **Vertical slices**: every app lives in `frontend/slices/<slug>/`; cross-slice
  imports go through the barrel `@/features/<slug>` only.
- **Host seam**: each app's only host coupling is its `lib/host.ts`. API routes
  never touch `fs`/`child_process` directly — always through `lib/host/*`
  (bounds + realpath checks).
- **Max ~200 lines/file**, single responsibility, shadcn/ui primitives only,
  theme tokens not raw hex, mobile-first.
- **Routing**: one catch-all route; URL writes via the History API, never
  `router.push`; dock/launcher links keep `prefetch={false}`.
- Conventional commits (`feat:`, `fix:`, `docs:`…).

## Security issues

Do **not** open a public issue — see [SECURITY.md](./SECURITY.md).
