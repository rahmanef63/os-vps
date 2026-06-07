#!/usr/bin/env bash
# Clipboard history: record via seam, ⌘⇧V overlay lists it.
set -euo pipefail
. "$(dirname "$0")/../e2e-lib.sh"
"$BROWSER" go "$E2E_URL/?e2e=1" >/dev/null
sleep 4
palrun "E2E: record clipboard sample"; palend
"$BROWSER" key "Meta+Shift+v" >/dev/null; sleep 1.5
wait_for "Clipboard history" || { echo "overlay did not open"; exit 1; }
has "E2E clipboard sample text" || { echo "clip missing from history"; exit 1; }
"$BROWSER" key Escape >/dev/null; sleep 1
exit 0
