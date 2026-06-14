#!/usr/bin/env bash
# Post-deploy smoke test. Run AFTER `pnpm build && sudo systemctl restart os-vps.service`.
# Catches the chunk-MIME drift that has bitten this deploy twice (per CLAUDE.md).
set -euo pipefail

BASE_URL="${OS_BASE_URL:-http://localhost:4005}"
echo "Smoke testing ${BASE_URL}..."

# Reuse the vitest smoke suite. Fails fast if any of the 4 checks fail.
E2E_BASE_URL="${BASE_URL}" pnpm vitest run scripts/e2e/smoke.test.ts --reporter=verbose

echo "Smoke OK."
