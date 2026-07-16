# Topside — a mobile-first web cockpit for a headless Linux VPS

> Service slug stays `os-vps` (deploy paths, systemd unit, domain); **Topside** is the product name shown in the UI.

Control a headless VPS from any browser — especially a phone. A real terminal (full PTY — `vim`, `top`, `ssh` all work), file manager, system monitor, media preview and an optional remote browser, in a desktop-style shell. The point is **utility**: fast admin of a headless box without the weight of XRDP/VNC.

It's a **single-owner** control plane for **one VPS you own** — not a real OS, not multi-tenant, not a SaaS. The desktop UI is a metaphor.

![Topside desktop — Files, Terminal and System Monitor over the dock](./docs/media/hero-desktop.png)

<p align="center">
  <img src="./docs/media/demo.gif" alt="Spotlight (⌘K) opening the System Monitor" width="720" />
</p>

## Install

One command on your VPS — installs prerequisites, builds, and sets up the systemd service:

```bash
curl -fsSL https://raw.githubusercontent.com/rahmanef63/os-vps/main/scripts/install.sh | bash
```

It generates your credentials, prints the first-login password once, and tells you how to pair your first device. Options: `… | bash -s -- --port 4005 --no-service`; remove with `… | bash -s -- --uninstall`. Production details (TLS reverse proxy, browser service, hardware sizing, security checklist): **[docs/INSTALL.md](./docs/INSTALL.md)**.

## Local dev

```bash
pnpm install
cp .env.example .env.local   # set OS_LOGIN_PASSWORD + OS_SESSION_SECRET (openssl rand -hex 32)
pnpm dev                     # http://localhost:3000
node scripts/approve-device.js <deviceId> "my laptop"   # deviceId shows on the login screen
```

## Features

- **Files** — realpath-jailed file manager: browse, upload, drag-and-drop, trash, search + Finder-style type-ahead.
- **Terminal** — a real interactive PTY (`vim`/`top`/`ssh` work), not a one-shot command box.
- **Claude Code** — open any folder straight into a `claude` session in a fresh terminal.
- **Alfa AI** — built-in assistant, **BYOK + multi-provider**: Anthropic, OpenAI and ~34 OpenAI-compatible providers via a vendored model registry.
- **Multi-shell** — macOS · Windows · iOS · Android desktop metaphors (plus a Dashboard), switchable per surface.
- **Widgets & apps** — glanceable CPU/mem/disk widgets, system monitor, media viewer, image editor, optional real remote browser (Playwright).

## Architecture

Single Next.js app that runs *on* the server as a normal **non-root** user and talks to the host directly — **no database, no external agent**. Signed-cookie auth (`lib/auth`) gates a bounded host layer (`lib/host` → Node `fs`/`child_process`, filesystem-jailed). Every feature is a self-contained vertical slice under `frontend/slices/<slug>/`, and one manifest (`os-shell/shell.manifest.ts`) drives the shell — so **adding an app = one slice + one manifest entry**.

```
phone / browser ──https──> os-vps (Next.js :4005) ──┬── lib/host → Node fs / child_process (non-root)
                signed-cookie auth                    └── os-browser (Playwright :4002, loopback, optional)
```

Stack: Next.js 16 · React 19 · Tailwind 4 · shadcn/ui · TypeScript. Deep dive: **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)**.

## Security

An authenticated session **is the box owner** — real shell and file access as the process user, so treat it like an SSH login. Run it behind Tailscale/VPN or a TLS reverse proxy with an IP allowlist, use a strong `OS_LOGIN_PASSWORD`, and approve only your own devices. Full threat model, mechanics and hardening checklist: **[docs/FAQ.md](./docs/FAQ.md)** · **[docs/INSTALL.md](./docs/INSTALL.md)**.

## Docs

| Doc | What's in it |
|---|---|
| [INSTALL.md](./docs/INSTALL.md) | Production: credentials, systemd, TLS, browser service, hardware sizing, security checklist |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | AppShell framework, slices, seams, routing |
| [MODELS-INTEGRATION.md](./docs/MODELS-INTEGRATION.md) | Alfa AI: BYOK, multi-provider model registry |
| [FAQ.md](./docs/FAQ.md) · [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) | Security posture, device approval, costs · errors + fixes |
| [SLICE-CATALOG.md](./docs/SLICE-CATALOG.md) · [CHANGELOG.md](./docs/CHANGELOG.md) | Every slice in the repo · chronological deltas |

## Status

Personal tool, **alpha** — auth + FS jail implemented and the host layer is bounded, but it has **not** had a third-party security audit. Quality gates (typecheck · lint · vitest · build) run on a pre-push hook; `GET /api/health` gives a liveness probe.

## Related

Part of the Rahman web-OS family: **[Rahman OS](https://shell.rahmanef.com)** (web-OS shell) · **[belajar-with-rahmanef](https://study-with.rahmanef.com)** (learn AI in a browser OS) · **[Rahman Resources](https://resource.rahmanef.com)** (the slice library these UIs are built from).

## License

MIT — see [LICENSE](./LICENSE).
