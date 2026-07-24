<h1 align="center">Manef Shell OS</h1>

<p align="center"><strong>Your Linux server, finally usable from your phone.</strong></p>

<p align="center">
  Open a real terminal, manage files, inspect system health, and use AI from one private browser workspace.
</p>

<p align="center">
  <a href="https://os.rahmanef.com"><strong>Live Demo</strong></a>
  ·
  <a href="./docs/media/demo.gif"><strong>Watch Demo</strong></a>
  ·
  <a href="#install"><strong>Install</strong></a>
</p>

<p align="center">
  <a href="https://github.com/rahmanef63/os-vps/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/rahmanef63/os-vps/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="Open Source" src="https://img.shields.io/badge/Open%20Source-MIT-green" />
  <img alt="Self-hosted" src="https://img.shields.io/badge/Self--hosted-yes-2f7bf6" />
  <img alt="Public Alpha" src="https://img.shields.io/badge/Public%20Alpha-Developer%20Preview-f59e0b" />
  <img alt="Single-owner" src="https://img.shields.io/badge/Single--owner-focused-111827" />
  <img alt="Tailscale recommended" src="https://img.shields.io/badge/Tailscale%20recommended-VPN%20first-7c3aed" />
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/github/package-json/v/rahmanef63/os-vps?label=version&color=2f7bf6" />
  <img alt="node" src="https://img.shields.io/badge/node-%E2%89%A520.9-3c873a?logo=nodedotjs&logoColor=white" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" />
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-10.32.1-f69220?logo=pnpm&logoColor=white" />
</p>

**Manef Shell OS** (**MSO** in the UI) is an open-source, mobile-friendly visual shell for a Linux server you own. It brings a real terminal, file manager, live system metrics, and a BYOK AI assistant into one private browser workspace without running a full remote desktop.

MSO is **Public Alpha / Developer Preview** software. It runs on top of Linux as a normal non-root Node process. It is not an operating system, Linux distribution, desktop environment, VPS provider, or production-grade security platform.

For a real deployment, put MSO behind **Tailscale, a VPN, or a TLS reverse proxy with tight access control**. Do not expose the raw app port to the public internet.

## Product screenshot/video

![Manef Shell OS running as a browser workspace on desktop and mobile](./docs/media/mso-hero.webp)

<p align="center">
  <img src="./docs/media/demo.gif" alt="MSO demo: Spotlight opening the System Monitor" width="720" />
</p>

## What you can do

**Control** — terminal, files, and system monitor for the server you own.

- **Open a real terminal** — interactive PTY support for tools like `vim`, `top`, and `ssh`.
- **Manage files** — browse, upload, search, preview, rename, move, copy, zip, and delete within configured filesystem roots.
- **Inspect system health** — view live CPU, memory, disk, network, process, and uptime signals.

**Work** — code/text editor, browser, and media tools in the same workspace.

- **Edit project files** — open text/code files from the file manager without context switching.
- **Preview media** — inspect images, audio, video, PDFs, and sample demo assets in the browser.
- **Keep admin context together** — move between terminal, files, metrics, and browser views.

**Extend** — Alfa AI, modular slices, and custom apps.

- **Use BYOK AI** — Alfa uses credentials stored on your server, not committed to the repo.
- **Add app slices** — features are modular under `frontend/slices/<slug>/`.
- **Personalize the interface** — macOS, Windows, iOS, and Android shell layouts are UI preferences, not the core product.

## What can you do with MSO?

**Fix a server issue from your phone**  
Check system health, open a real terminal, inspect logs, and restart a service without opening a laptop.

**Manage project files visually**  
Browse, upload, rename, preview, and edit files without remembering every shell command.

**Work with your server in one workspace**  
Move between terminal, files, metrics, browser, and AI without switching between several admin tools.

## Live demo

The public demo should be deployed from a separate checkout with:

```bash
NEXT_PUBLIC_OS_DEMO=1 pnpm build && pnpm start
```

Demo mode skips real login, forces mock data, blocks live host API access, and shows a permanent demo banner. Use it for Product Hunt traffic. A real owner deployment should stay behind Tailscale/VPN or a protected HTTPS proxy.

- Live demo URL: <https://os.rahmanef.com> (deploy this URL with `NEXT_PUBLIC_OS_DEMO=1` before launch)
- Watch demo: [docs/media/demo.gif](./docs/media/demo.gif)

## Install

One command on your Linux server installs prerequisites, builds MSO, generates local credentials, and sets up the `os-vps.service` systemd unit:

```bash
curl -fsSL https://raw.githubusercontent.com/rahmanef63/os-vps/main/scripts/install.sh | bash
```

Run it as your normal server user, **not root**. The installer prints the first-login password once and explains how to approve your first browser device.

Useful options:

```bash
curl -fsSL https://raw.githubusercontent.com/rahmanef63/os-vps/main/scripts/install.sh | bash -s -- --port 4005
curl -fsSL https://raw.githubusercontent.com/rahmanef63/os-vps/main/scripts/install.sh | bash -s -- --no-service
curl -fsSL https://raw.githubusercontent.com/rahmanef63/os-vps/main/scripts/install.sh | bash -s -- --uninstall
```

Full production setup, TLS/VPN notes, filesystem roots, updates, and rollback steps live in [docs/INSTALL.md](./docs/INSTALL.md).

## Security warning

An authenticated MSO session can read allowed files and run commands as the user that owns the process. Treat it like SSH in a browser.

- Run as a dedicated non-root user.
- Prefer Tailscale or a VPN; otherwise use HTTPS plus a strict firewall or allowlist.
- Use a strong `OS_SESSION_SECRET` and a strong `OS_LOGIN_PASSWORD`.
- Approve only devices you own; device approval is an allowlist, not standards-based 2FA.
- Keep write roots narrow with `OS_FS_WRITE_ROOTS`.
- Never commit `.env.local`, API keys, or data from `~/.os-vps`.
- MSO has not had a third-party security audit.

More detail: [docs/FAQ.md](./docs/FAQ.md) and [docs/INSTALL.md](./docs/INSTALL.md).

## How it works

MSO is a single Next.js app that runs on your server as one non-root Node process. The app talks to host capabilities through local server routes and keeps features as vertical slices under `frontend/slices/<slug>/`.

```mermaid
flowchart LR
  U["Phone / Browser"]
  subgraph VPS["Your Linux server"]
    APP["MSO / os-vps<br/>Next.js 16 · React 19"]
    HOST["Host layer<br/>fs · PTY · sys metrics"]
    SLICES["Feature slices<br/>Files · Terminal · Monitor · Assistant"]
    AI["Alfa AI<br/>BYOK"]
  end
  U -->|"HTTPS or Tailscale/VPN"| APP
  APP --> HOST
  APP --> SLICES
  APP --> AI
```

Deep dive: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Comparison

The tools below have different scopes. This comparison is intended to explain where MSO fits, not to claim it replaces every specialized server administration tool.

| | **MSO** | Cockpit | ttyd | FileBrowser | Netdata | Tailscale SSH |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Product maturity | Early alpha | Mature | Varies | Mature | Mature | Mature |
| Third-party security audit | No | Varies | Varies | Varies | Varies | Yes |
| Multi-user support | No | Yes | Varies | Yes | Yes | Yes |
| Mobile-first interface | Yes | Partial | Varies | Partial | Partial | Not a focus |
| Real PTY | Yes | Yes | Yes | No | No | Yes |
| File manager | Yes | Partial | No | Yes | No | No |
| Metrics | Yes | Yes | No | No | Yes | No |
| Built-in AI | Yes, BYOK | No | No | No | No | No |
| Setup complexity | One script | Varies | Low | Low | Varies | Low |
| Service/package administration | Basic | Strong | Not a focus | Not a focus | Metrics focus | SSH only |

## Development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Quality gates:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm check
pnpm build
bash -n scripts/install.sh
```

The package manager is pinned in `package.json` as `pnpm@10.32.1`. Use pnpm so the lockfile and native `node-pty` build path stay predictable.

Full guide: [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md).

## Tested platforms

Not yet formally tested across a full distro matrix.

Tested:

- Ubuntu 22.04
- Ubuntu 24.04

Expected to work:

- Debian 12
- Other systemd-based Linux distributions with Node.js 20.9+ and build tools

Not currently supported:

- Windows host
- macOS host
- Automatic service install on non-systemd hosts
- Root deployment

## Documentation

| Doc | What's in it |
|---|---|
| [docs/INSTALL.md](./docs/INSTALL.md) | Server install, credentials, systemd, TLS/VPN, updates, rollback |
| [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) | Local dev, quality gates, pnpm, deploy hazards |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | App shell, host layer, slices, routing |
| [docs/MODELS-INTEGRATION.md](./docs/MODELS-INTEGRATION.md) | Alfa AI and BYOK model providers |
| [docs/FAQ.md](./docs/FAQ.md) | Security posture, device approval, costs, product boundaries |
| [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) | Common install, build, and deployment failures |
| [SECURITY.md](./SECURITY.md) | Responsible disclosure and deployment warnings |
| [docs/PRODUCT_HUNT.md](./docs/PRODUCT_HUNT.md) | Product Hunt launch copy and feedback prompts |
| [docs/DEMO-SCRIPT.md](./docs/DEMO-SCRIPT.md) | 60-second demo video script |

## Status

MSO is **Public Alpha / Developer Preview**. The core auth, filesystem bounds, terminal, metrics, and slice architecture are implemented, but the project is still early and unaudited. Expect rough edges, breaking changes, and missing production hardening.

## License

MIT — see [LICENSE](./LICENSE).
