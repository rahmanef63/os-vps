# Security Policy

os-vps (Topside) is a **personal, single-owner tool, alpha quality**. It has had
internal adversarial review but **no third-party security audit**. Read the
[Threat model](./README.md#threat-model) and
[Security model](./README.md#security-model-mechanics) in the README before
deploying — an authenticated session is an effective remote shell on your box,
by design.

## Supported versions

Only the latest commit on `main` is supported. There are no release branches.

## Reporting a vulnerability

- **Preferred:** open a [GitHub Security Advisory](https://github.com/rahmanef63/os-vps/security/advisories/new)
  (private disclosure).
- Or email **casadezian@gmail.com** with subject `os-vps security`.

Please include reproduction steps and which part of the documented threat model
the issue violates. Expect a reply within a week (solo maintainer).

## Out of scope

- Anything requiring an already-authenticated session to do what the README
  says a session can do (run commands, read/write inside configured roots) —
  that is the product, not a vulnerability.
- The destructive-command guard in `lib/host/exec.ts` is an **accident
  tripwire, not a sandbox** — bypassing it with shell tricks is expected and
  documented.
- Deployments that ignore the minimum security checklist (no TLS/VPN, `/` as a
  read root on a public box, weak `OS_SESSION_SECRET`).

## In scope (examples)

- Auth bypass: session forgery without `OS_SESSION_SECRET`, device-approval
  bypass, rate-limit defeat that enables practical brute force.
- Filesystem jail escape: reading/writing outside `OS_FS_READ_ROOTS` /
  `OS_FS_WRITE_ROOTS`, or reaching the credential denylist
  (`.env*`, `~/.os-vps/*`) through the FS API.
- Unauthenticated access to any `/api/v1`, `/api/assistant`, `/api/config` or
  `/api/auth/devices` route.
- CSRF/clickjacking that triggers exec/fs actions cross-origin despite the
  `SameSite=Strict` cookie + `Sec-Fetch-Site` proxy check + `frame-ancestors`.
