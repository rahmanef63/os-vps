#!/usr/bin/env bash
# os-vps (Topside) one-command installer — fresh single-owner Linux VPS.
#
#   curl -fsSL https://raw.githubusercontent.com/rahmanef63/os-vps/main/scripts/install.sh | bash
#
# Idempotent: re-running updates the checkout, rebuilds, and restarts the
# service. Fully non-interactive (safe for curl|bash — no tty): the login
# password + session secret are GENERATED, never prompted, and an existing
# .env.local is preserved.
set -euo pipefail

# ---- config: env override > flag > default ----
REPO_URL="${OSVPS_REPO:-https://github.com/rahmanef63/os-vps.git}"
DIR="${OSVPS_DIR:-$HOME/os-vps}"
DIR_EXPLICIT=0
REF="${OSVPS_REF:-main}"
PORT="${OSVPS_PORT:-4005}"
SERVICE="os-vps.service"
DO_SERVICE=1
DO_UNINSTALL=0
# Let corepack fetch the pnpm version pinned in package.json without a tty prompt.
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# ---- pretty output (tty + NO_COLOR aware) ----
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_OK=$'\033[32m'; C_WARN=$'\033[33m'; C_ERR=$'\033[31m'; C_DIM=$'\033[2m'; C_RST=$'\033[0m'
else
  C_OK=; C_WARN=; C_ERR=; C_DIM=; C_RST=
fi
info() { printf '%s·%s %s\n' "$C_DIM"  "$C_RST" "$*"; }
ok()   { printf '%s✓%s %s\n' "$C_OK"   "$C_RST" "$*"; }
warn() { printf '%s!%s %s\n' "$C_WARN" "$C_RST" "$*" >&2; }
die()  { printf '%s✗%s %s\n' "$C_ERR"  "$C_RST" "$*" >&2; exit 1; }

usage() {
  cat <<EOF
os-vps installer
  --dir PATH     install dir (default: \$HOME/os-vps, or an existing service's dir)
  --ref REF      git ref/branch/tag to check out (default: main)
  --port N       listen port (default: 4005)
  --no-service   build only; skip the systemd unit
  --uninstall    stop+disable+remove the systemd unit (keeps code + ~/.os-vps)
  -h, --help     this help
Env: OSVPS_DIR  OSVPS_REF  OSVPS_PORT  OSVPS_REPO
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dir)        DIR="$2"; DIR_EXPLICIT=1; shift 2 ;;
    --ref)        REF="$2"; shift 2 ;;
    --port)       PORT="$2"; shift 2 ;;
    --no-service) DO_SERVICE=0; shift ;;
    --uninstall)  DO_UNINSTALL=1; shift ;;
    -h|--help)    usage; exit 0 ;;
    *)            die "unknown arg: $1 (see --help)" ;;
  esac
done

# ---- never as root: an authed session gets shell as this user ----
[ "$(id -u)" -ne 0 ] || die "run as your normal NON-root user, not root (os-vps runs shell as the process user)."

sudo_do() { if command -v sudo >/dev/null 2>&1; then sudo "$@"; else die "need root for: $* (install sudo or run the step by hand)"; fi; }

# If a service already exists, update IT in place (unless --dir was given) — so a
# re-run never spins up a divergent second copy next to a working install.
if [ "$DIR_EXPLICIT" -eq 0 ] && command -v systemctl >/dev/null 2>&1; then
  existing="$(systemctl show -p WorkingDirectory --value "$SERVICE" 2>/dev/null || true)"
  [ -n "$existing" ] && [ -d "$existing/.git" ] && DIR="$existing" && info "found existing service → updating $DIR"
fi

# ---- uninstall ----
if [ "$DO_UNINSTALL" -eq 1 ]; then
  if command -v systemctl >/dev/null 2>&1; then
    sudo_do systemctl disable --now "$SERVICE" 2>/dev/null || true
    sudo_do rm -f "/etc/systemd/system/$SERVICE"
    sudo_do systemctl daemon-reload
    ok "removed $SERVICE"
  fi
  info "code left at $DIR and data at ~/.os-vps — delete by hand if you want them gone."
  exit 0
fi

# ---- prereqs ----
ensure_git() {
  command -v git >/dev/null 2>&1 && return
  info "installing git…"
  if   command -v apt-get >/dev/null 2>&1; then sudo_do apt-get update -qq && sudo_do apt-get install -y -qq git
  elif command -v dnf     >/dev/null 2>&1; then sudo_do dnf install -y -q git
  elif command -v pacman  >/dev/null 2>&1; then sudo_do pacman -Sy --noconfirm git
  else die "git missing and no known package manager — install git and re-run."; fi
}

node_ok() {
  command -v node >/dev/null 2>&1 || return 1
  node -e 'const[a,b]=process.versions.node.split(".").map(Number);process.exit(a>20||(a===20&&b>=9)?0:1)'
}
ensure_node() {
  node_ok && { info "node $(node -v) ok"; return; }
  warn "Node >=20.9 not found"
  if command -v apt-get >/dev/null 2>&1; then
    info "installing Node 22 via NodeSource…"
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo_do -E bash -
    sudo_do apt-get install -y -qq nodejs
  else
    die "install Node >=20.9 (22 recommended) from https://nodejs.org or your distro, then re-run."
  fi
  node_ok || die "Node still <20.9 after install."
}

ensure_pnpm() {
  command -v pnpm >/dev/null 2>&1 && { info "pnpm $(pnpm -v) ok"; return; }
  info "enabling pnpm via corepack…"
  if command -v corepack >/dev/null 2>&1; then
    # Do NOT force pnpm@latest: the repo pins pnpm via package.json's
    # "packageManager" field and corepack honors it when pnpm runs in-project.
    # Forcing latest (pnpm 11) drops pnpm.onlyBuiltDependencies/overrides →
    # node-pty isn't compiled and the frozen lockfile mismatches.
    corepack enable pnpm >/dev/null 2>&1 || sudo_do corepack enable pnpm
  else
    sudo_do npm install -g pnpm@10
  fi
  command -v pnpm >/dev/null 2>&1 || die "pnpm install failed."
}

ensure_buildtools() {
  # pnpm compiles node-pty (a native addon) → needs a C/C++ toolchain + python3.
  # This is the single most likely install failure on a minimal box.
  command -v cc >/dev/null 2>&1 && command -v python3 >/dev/null 2>&1 && return
  info "installing build toolchain (for node-pty)…"
  if   command -v apt-get >/dev/null 2>&1; then sudo_do apt-get update -qq && sudo_do apt-get install -y -qq build-essential python3
  elif command -v dnf     >/dev/null 2>&1; then sudo_do dnf install -y -q gcc-c++ make python3
  elif command -v pacman  >/dev/null 2>&1; then sudo_do pacman -Sy --noconfirm base-devel python
  else warn "no known package manager — if 'pnpm install' fails on node-pty, install a C++ toolchain + python3 by hand."; fi
}

ensure_git; ensure_node; ensure_pnpm; ensure_buildtools

# portable 32-byte hex RNG (node is guaranteed present by now)
rand_hex() {
  if command -v openssl >/dev/null 2>&1; then openssl rand -hex "$1"
  else node -e "process.stdout.write(require('crypto').randomBytes($1).toString('hex'))"; fi
}

# ---- clone or update (idempotent, resilient to a dirty tree) ----
if [ -d "$DIR/.git" ]; then
  info "updating existing checkout at $DIR"
  git -C "$DIR" fetch --quiet origin || warn "git fetch failed"
  git -C "$DIR" checkout --quiet "$REF" 2>/dev/null || warn "checkout $REF skipped (uncommitted changes?)"
  git -C "$DIR" pull --ff-only --quiet origin "$REF" 2>/dev/null || warn "ff-only pull skipped (detached/pinned/dirty?)"
else
  info "cloning $REPO_URL → $DIR"
  git clone --quiet --branch "$REF" "$REPO_URL" "$DIR" 2>/dev/null || git clone --quiet "$REPO_URL" "$DIR"
fi
cd "$DIR"

# ---- deps (compiles node-pty) ----
info "installing dependencies…"
pnpm install --frozen-lockfile || pnpm install

# ---- data dir + secrets (write .env.local only if absent) ----
mkdir -p "$HOME/.os-vps" && chmod 700 "$HOME/.os-vps"

GEN_PW=""
if [ ! -f .env.local ]; then
  SECRET="$(rand_hex 32)"
  GEN_PW="os-$(rand_hex 4)"           # memorable factor; the STRONG factor is device approval
  ( umask 077
    cat > .env.local <<EOF
# os-vps — generated by install.sh. Private; NEVER commit.
OS_LOGIN_PASSWORD=$GEN_PW
OS_SESSION_SECRET=$SECRET
# SESSION_EXPIRY_HOURS=24
# OS_FS_READ_ROOTS=~:~/projects
# OS_FS_WRITE_ROOTS=~:~/projects
# OS_AUDIT_LOG=~/.os-vps/audit.log
EOF
  )
  chmod 600 .env.local
  ok "wrote .env.local (login password + session secret generated)"
else
  info ".env.local exists — left untouched (existing secrets preserved)"
fi

# ---- build ----
info "building (next build)…"
pnpm build

# ---- systemd unit ----
if [ "$DO_SERVICE" -eq 1 ] && command -v systemctl >/dev/null 2>&1; then
  # Start via npm (always on PATH, ships with node) to match the proven prod unit;
  # PORT/HOSTNAME are set as env too so `next start` binds correctly regardless.
  NPM_BIN="$(command -v npm)"
  info "installing $SERVICE (needs sudo)…"
  sudo_do tee "/etc/systemd/system/$SERVICE" >/dev/null <<EOF
[Unit]
Description=os-vps web OS (Next.js)
After=network.target

[Service]
Type=simple
User=$(id -un)
WorkingDirectory=$DIR
EnvironmentFile=$DIR/.env.local
Environment=PORT=$PORT
Environment=HOSTNAME=0.0.0.0
ExecStart=$NPM_BIN run start -- --hostname 0.0.0.0 --port $PORT
Restart=always
RestartSec=5
KillSignal=SIGTERM
TimeoutStopSec=20
MemoryMax=3G
StandardOutput=journal
StandardError=journal
SyslogIdentifier=os-vps

[Install]
WantedBy=multi-user.target
EOF
  sudo_do systemctl daemon-reload
  sudo_do systemctl enable --now "$SERVICE"
  ok "$SERVICE enabled + started"

  info "waiting for http://127.0.0.1:$PORT/api/health …"
  up=0
  for _ in $(seq 1 30); do
    if curl -fsS --max-time 3 "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then up=1; ok "health OK"; break; fi
    sleep 2
  done
  [ "$up" -eq 1 ] || warn "no /api/health answer yet — check: journalctl -u os-vps -e"
else
  [ "$DO_SERVICE" -eq 1 ] && warn "no systemctl here — skipping service. Run manually: PORT=$PORT pnpm start"
fi

# ---- next steps ----
ok "os-vps installed at $DIR"
cat <<EOF

  Open:     http://<this-host>:$PORT     (put Tailscale/TLS in front — do NOT expose :$PORT raw)
  Env:      $DIR/.env.local
EOF
[ -n "$GEN_PW" ] && printf '  Password: %s   (edit OS_LOGIN_PASSWORD in .env.local + restart to change)\n' "$GEN_PW"
cat <<EOF

  Pair your first device (device approval is the strong 2nd factor):
    1. Open the URL, enter the password — the browser lands PENDING and shows a device id.
    2. On this server:
         node $DIR/scripts/approve-device.js --list                 # see the pending id
         node $DIR/scripts/approve-device.js <deviceId> "my phone"  # approve it
    3. Reload + log in. Approve later devices from Settings → Devices.

  Logs:     journalctl -u os-vps -f
  Update:   re-run this installer (pull + rebuild + restart), or --uninstall to remove
  Security: firewall :$PORT (and :4002) from the public net; review ~/.os-vps/audit.log
EOF
