# Product Hunt

## Product name

MSO — Manef Shell OS

## Tagline

Manage your Linux server from any browser.

## Description

MSO is an open-source, mobile-friendly visual shell for a Linux server you own.
It combines a real terminal, file manager, live system metrics, media tools,
and an optional BYOK AI assistant in one private browser workspace.

## First comment draft

I built MSO because managing a personal Linux server from a phone is still more
awkward than it should be. SSH is powerful, but it is not always comfortable on
mobile, and most admin workflows make you jump between terminal tabs, file
transfer tools, metrics dashboards, docs, and AI chat.

MSO is a visual shell for a server you already own. It is not a real operating
system, Linux distribution, desktop environment, or VPS provider. The "OS" name
is the desktop metaphor: one browser workspace for terminal, files, metrics,
media tools, and optional BYOK AI.

It is single-owner on purpose. An authenticated session can access files and run
commands as the Linux user that owns the process, so the recommended deployment
is behind Tailscale or another VPN. The public demo uses mock data only.

This is Public Alpha / Developer Preview software and has not had a third-party
security audit. I am looking for feedback on the core workflow before widening
the scope.

## Feedback questions

1. Which server task would you most want to perform from your phone?
2. Is the visual shell useful, or would you prefer a simpler dashboard?
3. Which security or deployment concern would stop you from trying it?
4. Which Linux distributions should be tested next?

## Known limitations

- Public alpha
- Single-owner
- No third-party security audit
- No multi-user RBAC
- Recommended for private network access
- Some apps are optional or experimental
