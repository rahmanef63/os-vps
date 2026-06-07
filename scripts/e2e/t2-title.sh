#!/usr/bin/env bash
# document.title follows the focused window — "Files — Topside".
set -euo pipefail
. "$(dirname "$0")/../e2e-lib.sh"
"$BROWSER" go "$E2E_URL/?e2e=1" >/dev/null
sleep 4
palrun "Files"; palend
sleep 2
t="$(page_title)"
case "$t" in "Files — Topside") ;; *) echo "expected 'Files — Topside', got: $t"; exit 1;; esac
exit 0
