#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

HOST="${HOST:-0.0.0.0}"
STABLE_PORT="${STABLE_PORT:-9000}"
STABLE_DOMAIN="${STABLE_DOMAIN:-grub.sky0cloud.dpdns.org}"
ACTION="${1:-menu}"
TMP_DIR="${TMP_DIR:-$ROOT_DIR/.tmp}"
STABLE_PID_FILE="${STABLE_PID_FILE:-$TMP_DIR/stable-server.pid}"
STABLE_LOG_FILE="${STABLE_LOG_FILE:-$TMP_DIR/stable-server.log}"

log() {
  printf '[grubx] %s\n' "$*"
}

fail() {
  printf '[grubx] Error: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command '$1' was not found in PATH"
}

ensure_tmp_dir() {
  mkdir -p "$TMP_DIR"
}

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    PNPM_CMD=(pnpm)
    return
  fi

  require_command corepack
  log "pnpm was not found. Enabling Corepack-managed pnpm..."
  corepack enable >/dev/null 2>&1 || true
  PNPM_CMD=(corepack pnpm)
}

run_pnpm() {
  "${PNPM_CMD[@]}" "$@"
}

ensure_env_file() {
  if [[ -f .env ]]; then
    return
  fi

  if [[ -f .env.example ]]; then
    log "'.env' was missing. Renaming '.env.example' to '.env'..."
    mv .env.example .env
    return
  fi

  log "No '.env' or '.env.example' file found. Continuing without env bootstrap."
}

install_dependencies() {
  ensure_pnpm
  ensure_env_file
  log "Installing dependencies..."
  run_pnpm install
}

typecheck_app() {
  ensure_pnpm
  ensure_env_file
  log "Running TypeScript typecheck..."
  run_pnpm typecheck
}

build_app() {
  ensure_pnpm
  ensure_env_file
  log "Building Next.js production bundle..."
  run_pnpm build
}

full_setup() {
  install_dependencies
  typecheck_app
  build_app
}

clean_install() {
  ensure_pnpm
  ensure_env_file
  log "Removing node_modules and Next build output..."
  rm -rf node_modules .next
  log "Reinstalling dependencies from scratch..."
  run_pnpm install --force
}

ensure_build_output() {
  if [[ -d .next ]]; then
    return
  fi

  log "'.next' was not found. Building before start..."
  build_app
}

refresh_build_output() {
  ensure_pnpm
  ensure_env_file
  log "Refreshing Next.js production build before server start..."
  run_pnpm build
}

is_pid_running() {
  local pid="$1"
  if [[ -z "$pid" ]]; then
    return 1
  fi

  kill -0 "$pid" >/dev/null 2>&1
}

read_stable_pid() {
  if [[ -f "$STABLE_PID_FILE" ]]; then
    tr -d '[:space:]' < "$STABLE_PID_FILE"
  fi
}

stop_stable_server() {
  local pid

  pid="$(read_stable_pid)"
  if [[ -z "$pid" ]]; then
    log "No stable server PID file found."
    return 0
  fi

  if ! is_pid_running "$pid"; then
    log "Stable server PID $pid is not running. Cleaning stale PID file."
    rm -f "$STABLE_PID_FILE"
    return 0
  fi

  log "Stopping stable server PID $pid..."
  kill "$pid"

  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if ! is_pid_running "$pid"; then
      rm -f "$STABLE_PID_FILE"
      log "Stable server stopped."
      return 0
    fi
    sleep 1
  done

  log "Stable server did not exit cleanly. Sending SIGKILL to PID $pid..."
  kill -9 "$pid" >/dev/null 2>&1 || true
  rm -f "$STABLE_PID_FILE"
}

start_stable_server() {
  local mode="$1"

  ensure_pnpm
  ensure_env_file
  refresh_build_output

  if [[ "$mode" == "foreground" ]]; then
    log "Starting stable server in foreground on ${HOST}:${STABLE_PORT} (${STABLE_DOMAIN})..."
    exec "${PNPM_CMD[@]}" exec next start -H "${HOST}" -p "${STABLE_PORT}"
  fi

  ensure_tmp_dir

  local existing_pid
  existing_pid="$(read_stable_pid)"
  if [[ -n "$existing_pid" ]] && is_pid_running "$existing_pid"; then
    fail "stable server is already running with PID $existing_pid"
  fi

  rm -f "$STABLE_PID_FILE"
  : > "$STABLE_LOG_FILE"

  log "Starting stable server in background on ${HOST}:${STABLE_PORT} (${STABLE_DOMAIN})..."
  (
    nohup "${PNPM_CMD[@]}" exec next start -H "${HOST}" -p "${STABLE_PORT}" >>"$STABLE_LOG_FILE" 2>&1 &
    echo $! > "$STABLE_PID_FILE"
  )

  local pid
  pid="$(read_stable_pid)"
  sleep 2

  if [[ -z "$pid" ]] || ! is_pid_running "$pid"; then
    rm -f "$STABLE_PID_FILE"
    fail "stable server failed to start. Check $STABLE_LOG_FILE"
  fi

  log "Stable server is running in background with PID $pid."
  log "Log file: $STABLE_LOG_FILE"
}

doctor() {
  ensure_pnpm
  ensure_tmp_dir
  local stable_pid
  stable_pid="$(read_stable_pid)"

  log "Environment summary"
  printf '  root: %s\n' "$ROOT_DIR"
  printf '  host: %s\n' "$HOST"
  printf '  stable_port: %s\n' "$STABLE_PORT"
  printf '  stable_domain: %s\n' "$STABLE_DOMAIN"
  printf '  node: %s\n' "$(node --version 2>/dev/null || echo 'missing')"
  printf '  pnpm: %s\n' "$(run_pnpm --version 2>/dev/null || echo 'unavailable')"
  printf '  env_file: %s\n' "$(
    if [[ -f .env ]]; then
      echo ".env"
    elif [[ -f .env.example ]]; then
      echo ".env.example"
    else
      echo "missing"
    fi
  )"
  printf '  next_build: %s\n' "$([[ -d .next ]] && echo present || echo missing)"
  printf '  node_modules: %s\n' "$([[ -d node_modules ]] && echo present || echo missing)"
  printf '  stable_pid_file: %s\n' "$([[ -f "$STABLE_PID_FILE" ]] && echo "$STABLE_PID_FILE" || echo missing)"
  printf '  stable_log_file: %s\n' "$([[ -f "$STABLE_LOG_FILE" ]] && echo "$STABLE_LOG_FILE" || echo missing)"
  printf '  stable_server: %s\n' "$(
    if [[ -n "$stable_pid" ]] && is_pid_running "$stable_pid"; then
      echo "running (PID $stable_pid)"
    else
      echo "stopped"
    fi
  )"
}

show_help() {
  cat <<EOF
Usage: ./manage.sh [command]

Commands:
  menu           Interactive menu (default)
  setup          Rename .env.example -> .env if needed, install, typecheck, build
  install        Rename .env.example -> .env if needed, then install dependencies
  typecheck      Run TypeScript checks
  build          Build the Next.js production bundle
  stable         Start stable server in the foreground on ${HOST}:${STABLE_PORT}
  stable-bg      Start stable server in the background on ${HOST}:${STABLE_PORT}
  stop-stable    Stop the background stable server
  clean          Remove node_modules/.next and force a fresh install
  doctor         Show local environment status
  help           Show this help text

Environment overrides:
  HOST=0.0.0.0
  STABLE_PORT=9000
  STABLE_DOMAIN=${STABLE_DOMAIN}
  TMP_DIR=${TMP_DIR}
EOF
}

menu() {
  echo
  echo "1) Full Setup (install + typecheck + build)"
  echo "2) Install Dependencies"
  echo "3) Typecheck"
  echo "4) Build"
  echo "5) Stable Serve (foreground)"
  echo "6) Stable Serve (background)"
  echo "7) Stop Stable Server"
  echo "8) Clean Reinstall"
  echo "9) Doctor"
  echo "10) Help"
  echo
  read -rp "Choose an option [1-10]: " selection

  case "$selection" in
    1) full_setup ;;
    2) install_dependencies ;;
    3) typecheck_app ;;
    4) build_app ;;
    5) start_stable_server "foreground" ;;
    6) start_stable_server "background" ;;
    7) stop_stable_server ;;
    8) clean_install ;;
    9) doctor ;;
    10) show_help ;;
    *) fail "invalid selection '$selection'" ;;
  esac
}

case "$ACTION" in
  menu) menu ;;
  setup) full_setup ;;
  install) install_dependencies ;;
  typecheck) typecheck_app ;;
  build) build_app ;;
  stable) start_stable_server "foreground" ;;
  stable-bg) start_stable_server "background" ;;
  stop-stable) stop_stable_server ;;
  clean) clean_install ;;
  doctor) doctor ;;
  help|-h|--help) show_help ;;
  *) fail "unknown command '$ACTION'. Run './manage.sh help' for usage." ;;
esac
