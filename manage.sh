#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

HOST="${HOST:-0.0.0.0}"
DEV_PORT="${DEV_PORT:-9000}"
PREVIEW_PORT="${PREVIEW_PORT:-9000}"
STABLE_PORT="${STABLE_PORT:-9000}"
DEV_DOMAIN="${DEV_DOMAIN:-grub.sky0cloud.dpdns.org}"
PREVIEW_DOMAIN="${PREVIEW_DOMAIN:-grub.sky0cloud.dpdns.org}"
STABLE_DOMAIN="${STABLE_DOMAIN:-grub.sky0cloud.dpdns.org}"
ACTION="${1:-menu}"

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

start_dev() {
  ensure_pnpm
  ensure_env_file

  if [[ ! -d node_modules ]]; then
    log "'node_modules' missing. Installing dependencies first..."
    install_dependencies
  fi

  log "Starting Next.js dev server on ${HOST}:${DEV_PORT} (${DEV_DOMAIN})..."
  exec "${PNPM_CMD[@]}" exec next dev -H "${HOST}" -p "${DEV_PORT}"
}

start_server() {
  local mode="$1"
  local port="$2"
  local domain="$3"

  ensure_pnpm
  ensure_env_file
  refresh_build_output

  log "Starting Next.js ${mode} server on ${HOST}:${port} (${domain})..."
  exec "${PNPM_CMD[@]}" exec next start -H "${HOST}" -p "${port}"
}

doctor() {
  ensure_pnpm
  log "Environment summary"
  printf '  root: %s\n' "$ROOT_DIR"
  printf '  host: %s\n' "$HOST"
  printf '  dev_port: %s\n' "$DEV_PORT"
  printf '  dev_domain: %s\n' "$DEV_DOMAIN"
  printf '  preview_port: %s\n' "$PREVIEW_PORT"
  printf '  preview_domain: %s\n' "$PREVIEW_DOMAIN"
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
  dev            Start Next.js dev server on ${HOST}:${DEV_PORT}
  preview        Start Next.js preview server on ${HOST}:${PREVIEW_PORT}
  stable         Start Next.js stable server on ${HOST}:${STABLE_PORT}
  clean          Remove node_modules/.next and force a fresh install
  doctor         Show local environment status
  help           Show this help text

Environment overrides:
  HOST=0.0.0.0
  DEV_PORT=9000
  DEV_DOMAIN=${DEV_DOMAIN}
  PREVIEW_PORT=9000
  PREVIEW_DOMAIN=${PREVIEW_DOMAIN}
  STABLE_PORT=9000
  STABLE_DOMAIN=${STABLE_DOMAIN}
EOF
}

menu() {
  echo
  echo "1) Full Setup (install + typecheck + build)"
  echo "2) Install Dependencies"
  echo "3) Typecheck"
  echo "4) Build"
  echo "5) Dev Mode"
  echo "6) Production Preview"
  echo "7) Stable Serve"
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
    5) start_dev ;;
    6) start_server "preview" "$PREVIEW_PORT" "$PREVIEW_DOMAIN" ;;
    7) start_server "stable" "$STABLE_PORT" "$STABLE_DOMAIN" ;;
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
  dev) start_dev ;;
  preview) start_server "preview" "$PREVIEW_PORT" "$PREVIEW_DOMAIN" ;;
  stable) start_server "stable" "$STABLE_PORT" "$STABLE_DOMAIN" ;;
  clean) clean_install ;;
  doctor) doctor ;;
  help|-h|--help) show_help ;;
  *) fail "unknown command '$ACTION'. Run './manage.sh help' for usage." ;;
esac
