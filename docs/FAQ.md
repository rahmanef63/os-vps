# FAQ

### Is this a real operating system?

No. It's a single Next.js app with a desktop-style UI metaphor. The value is
utility — terminal, files, monitor, media, a real remote browser — in one
mobile-first pane. See [What this is — and is NOT](../README.md#what-this-is--and-is-not).

### Is it safe to expose to the public internet?

Treat an authenticated session like an SSH login: the owner can read files
(within roots) and run shell commands. The app ships device-approval 2FA,
signed cookies, rate limits, an FS jail and an audit log — but it has **not**
had a third-party security audit. Recommended posture: Tailscale/VPN, or a
TLS reverse proxy + IP allowlist. Public exposure is for the
[demo build](./INSTALL.md#8-optional--public-demo-mode) (no auth, no host
access), not the real thing.

### Why a password AND device approval?

The password is the memorable factor; the device allowlist is the strong one.
A leaked password alone gets an attacker a *pending* device and nothing else.
You approve devices from an already-approved device, or from the server with
`node scripts/approve-device.js <deviceId> "label"`.

### I lost all my approved devices. How do I get back in?

SSH to the box. Either approve your current device id (shown on the login
screen) with `scripts/approve-device.js`, or inspect
`~/.os-vps/auth-devices.json` directly. Deleting an entry revokes a device.

### Can multiple people use it?

It's single-owner by design: one password, one trust level, every session is
"the owner". Don't hand out sessions you wouldn't hand a shell.

### Why is there no database?

Nothing needs one. Sessions are stateless signed cookies; the device
allowlist, BYOK key and audit log are small JSON/JSONL files under
`~/.os-vps/`; window layout lives in the browser's localStorage. One process,
no migrations, nothing to back up except `~/.os-vps`.

### Can I run it as root so it can manage the whole box?

Don't. Run as a normal user and widen `OS_FS_READ_ROOTS=/` if you want
read-only browsing of the whole filesystem. Writes and exec stay bounded to
what the process user can do — that's the point.

### What are "mock" and "live" modes?

Every app works against an in-browser mock by default (zero risk, great for
trying the UI). Settings → Server flips an app to the live host API. The
public demo build is mock-only with no `/api` calls at all.

### How do I add my own app? (the modular part)

Each app is a self-contained vertical slice under `frontend/slices/<slug>/`
that exports an `AppDescriptor`. Register it in `os-shell/shell.manifest.ts`
(one entry: id, title, icon, slug, `load`) — dock, launcher, Spotlight, URL
routing and windowing pick it up with **no surface edits**. Shell features
(search, inspector, control-center, widgets…) are their own `shell-*` slices
contributed through the same manifest. See
[ARCHITECTURE.md](./ARCHITECTURE.md) and the slice list in
[SLICE-CATALOG.md](./SLICE-CATALOG.md).

### Can I reuse the apps outside os-vps?

Yes — that's deliberate. The shell framework (`appshell`) and several apps
(image editor, video editor, file explorer, media viewer, code editor) are
published as copy-in slices in the [Rahman Resources](https://resource.rahmanef.com)
catalog (`npx rr add <slug>`). Each slice's only host coupling is a small
`lib/host.ts` seam with injectable adapters, so the same code runs inside
os-vps or standalone in any Next.js app.

### Why is the project called os-vps but the UI says "Topside"?

`os-vps` is the repo/service/deploy slug (stable for paths and units);
"Topside" is the product name shown in the UI.

### What does it cost to run?

It's a normal Node process. Idle it sits around a few hundred MB RSS; the
systemd unit caps it at 3 GB. The optional headless Chromium (`os-browser`)
adds the usual browser footprint — skip it on tiny boxes.

### How was the codebase audited?

Two passes by the maintainer: `docs/AUDIT-2026-06-11.md` (initial cross-cutting
sweep — security, perf, a11y, slice boundaries) and `docs/AUDIT-2026-06-14.md`
(follow-up after the first round of fixes). The score trajectory across both
passes lives in `docs/SCORECARD-2026-06-14.md`. Quality gates (typecheck, lint,
280+ vitest tests, build) run on every push via the pre-push hook.

### Phone support?

Mobile-first is the point: the shell switches to a home-screen/app-switcher
surface on small viewports, apps get sheet-based sidebars, and the whole
thing is comfortable from a phone browser.
