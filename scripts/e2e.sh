#!/usr/bin/env bash
# E2E harness — DEMO-mode dev server + the real headless Chromium (os-browser
# service, read-only driving) through every check in scripts/e2e/*.sh.
# Demo mode = MockAdapter + no auth gate; shell features are fully live.
# NEVER asserts against the browser slice (quarantined).
# Usage: bash scripts/e2e.sh [check-name…]
set -uo pipefail
cd "$(dirname "$0")/.."

export E2E_PORT="${E2E_PORT:-3198}"
export E2E_URL="http://localhost:$E2E_PORT"
export BROWSER="$HOME/.claude/skills/os/os-browser.sh"

if curl -fso /dev/null "$E2E_URL"; then
  echo "port $E2E_PORT already serving something — set E2E_PORT"; exit 1
fi
"$BROWSER" health >/dev/null || { echo "os-browser service down"; exit 1; }

NEXT_PUBLIC_OS_DEMO=1 npx next dev -p "$E2E_PORT" >/tmp/osvps-e2e-next.log 2>&1 &
SERVER=$!
trap 'kill "$SERVER" 2>/dev/null' EXIT
for _ in $(seq 1 90); do
  curl -fso /dev/null "$E2E_URL" && break
  sleep 0.5
done
curl -fso /dev/null "$E2E_URL" || { echo "server never came up"; tail -20 /tmp/osvps-e2e-next.log; exit 1; }

pass=0 fail=0
for check in scripts/e2e/*.sh; do
  [ -e "$check" ] || continue
  name="$(basename "$check" .sh)"
  if [ "$#" -gt 0 ]; then case " $* " in *" $name "*) ;; *) continue ;; esac; fi
  if bash "$check" >"/tmp/osvps-e2e-$name.log" 2>&1; then
    echo "PASS $name"; pass=$((pass + 1))
  else
    echo "FAIL $name — /tmp/osvps-e2e-$name.log:"; tail -5 "/tmp/osvps-e2e-$name.log"; fail=$((fail + 1))
  fi
done
echo "e2e: $pass pass, $fail fail"
[ "$fail" -eq 0 ]
