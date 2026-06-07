#!/usr/bin/env bash
# Share sheet: seam shares a payload, built-in targets listed.
set -euo pipefail
. "$(dirname "$0")/../e2e-lib.sh"
"$BROWSER" go "$E2E_URL/?e2e=1" >/dev/null
sleep 4
palrun "E2E: share sample" # spotlight closes itself on run
wait_for "Copy as text" || { echo "share sheet did not open"; exit 1; }
has "Download as file" || { echo "download target missing"; exit 1; }
"$BROWSER" key Escape >/dev/null; sleep 1
exit 0
