#!/usr/bin/env bash
# Post-deploy smoke test. Run AFTER `pnpm build && sudo systemctl restart os-vps.service`.
# Catches the chunk-MIME drift that has bitten this deploy twice (per CLAUDE.md).
#
# REQUIRES: devDependencies installed on host (vitest lives in devDeps). Run
# `pnpm install` — NOT `pnpm install --prod`. If the deploy artifact is
# prod-only (no dev deps), we fall back to a raw /api/health probe below so
# the deploy gate still catches a totally-broken server.
set -euo pipefail

BASE_URL="${OS_BASE_URL:-http://localhost:4005}"
echo "Smoke testing ${BASE_URL}..."

# Prefer the full vitest smoke suite (4 checks: health, root HTML, chunk MIME,
# asset 200). Falls back to curl if vitest isn't on the deploy box.
if pnpm exec vitest --version >/dev/null 2>&1; then
  E2E_BASE_URL="${BASE_URL}" pnpm vitest run scripts/e2e/smoke.test.ts --reporter=verbose
else
  echo "vitest not installed (prod-only deploy?) — falling back to curl /api/health"
  curl -sf --max-time 5 "${BASE_URL}/api/health" >/dev/null || {
    echo "health check failed at ${BASE_URL}/api/health" >&2
    exit 1
  }
fi

echo "Smoke OK."
