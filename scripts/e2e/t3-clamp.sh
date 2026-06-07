#!/usr/bin/env bash
# Spawn cascade clamp: 8 windows via the drop seam, all rects in-viewport
# (e2e:bounds toast, 5s lifetime → has_soon).
set -euo pipefail
. "$(dirname "$0")/../e2e-lib.sh"
"$BROWSER" go "$E2E_URL/?e2e=1" >/dev/null
sleep 4
for _ in 1 2 3 4 5 6 7 8; do palrun "E2E: simulate cross-app drop"; palend; done
sleep 2
ok=""
for _ in 1 2 3; do
  palrun "E2E: report window bounds"; palend
  if has_soon "e2e:bounds ok"; then ok=1; break; fi
done
[ -n "$ok" ] || { echo "bounds check failed"; page_text | tail -20; exit 1; }
exit 0
