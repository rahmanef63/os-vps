#!/usr/bin/env bash
# Baseline: the demo shell boots — brand chrome renders, no auth gate.
set -euo pipefail
. "$(dirname "$0")/../e2e-lib.sh"
"$BROWSER" go "$E2E_URL/?e2e=1" >/dev/null
sleep 4
wait_for "MSO" || { echo "brand chrome missing"; exit 1; }
exit 0
