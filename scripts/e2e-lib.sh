# Shared helpers for scripts/e2e/*.sh (sourced — lives outside the checks dir).
# Requires $BROWSER + $E2E_URL from scripts/e2e.sh. Drives the appshell
# Spotlight (⌘K overlay), not a cmdk dialog — markers differ from app-shell.

page_text() { "$BROWSER" content | python3 -c 'import sys,json; print(json.load(sys.stdin)["text"])'; }
page_title() { "$BROWSER" content | python3 -c 'import sys,json; print(json.load(sys.stdin)["title"])'; }
has() { page_text | grep -qF "$1"; }

wait_for() { # poll until text appears (dev-mode compiles can be slow)
  for _ in 1 2 3 4 5 6 7 8 9 10; do has "$1" && return 0; sleep 1; done
  return 1
}

has_soon() { # fast poll for transient toasts (~3.5–5s lifetime)
  for _ in 1 2 3 4 5 6; do has "$1" && return 0; sleep 0.6; done
  return 1
}

pal_open() { # toggle until Spotlight is verifiably open ("Open app" hints render)
  for _ in 1 2 3; do
    "$BROWSER" key "Meta+k" >/dev/null; sleep 1
    has "Minimize all windows" && return 0
  done
  echo "spotlight failed to open"
  exit 1
}

palrun() { # open Spotlight, type query, run top hit
  pal_open
  for _ in 1 2 3; do
    "$BROWSER" key "Control+a" >/dev/null; "$BROWSER" key "Backspace" >/dev/null
    "$BROWSER" type "$1" >/dev/null; sleep 0.9
    page_text | grep -qiF "$1" && break
  done
  "$BROWSER" key Enter >/dev/null; sleep 0.9
}

palend() { "$BROWSER" key Escape >/dev/null; sleep 0.5; }
