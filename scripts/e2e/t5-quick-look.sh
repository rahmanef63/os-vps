#!/usr/bin/env bash
# Quick Look: seam publishes a target, overlay renders the fallback preview.
set -euo pipefail
. "$(dirname "$0")/../e2e-lib.sh"
"$BROWSER" go "$E2E_URL/?e2e=1" >/dev/null
sleep 4
palrun "E2E: quick look sample" # spotlight closes itself on run
wait_for "Quick Look sample body" || { echo "quick look did not open"; exit 1; }
"$BROWSER" key Escape >/dev/null; sleep 1
has "Quick Look sample body" && { echo "quick look did not close"; exit 1; }
exit 0
