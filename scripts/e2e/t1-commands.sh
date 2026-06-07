#!/usr/bin/env bash
# Command registry → Spotlight merge: a registered command runs from ⌘K,
# desktop widgets toggle on the wallpaper layer.
set -euo pipefail
. "$(dirname "$0")/../e2e-lib.sh"
"$BROWSER" go "$E2E_URL/?e2e=1" >/dev/null
sleep 4
palrun "Toggle desktop widgets"; palend
wait_for "Memory" || { echo "widgets did not appear"; exit 1; }
has "Storage" || { echo "storage card missing"; exit 1; }
palrun "Toggle desktop widgets"; palend
sleep 1
has "Memory" && { echo "widgets did not disappear"; exit 1; }
exit 0
