#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"
LOG_DIR="$ROOT_DIR/logs"
DB_DIR="$ROOT_DIR/data/mongodb"
ENV_FILE="$ROOT_DIR/backend/.env"

get_env_value() {
  local key="$1"
  local file="$2"
  if [ ! -f "$file" ]; then
    return 1
  fi
  grep -E "^${key}=" "$file" | tail -n 1 | sed -E "s/^${key}=//"
}

is_local_mongo_uri() {
  local uri="$1"
  case "$uri" in
    *localhost*|*127.0.0.1*|*::1*) return 0 ;;
    *) return 1 ;;
  esac
}

resolve_brew() {
  if command -v brew >/dev/null 2>&1; then
    command -v brew
    return 0
  fi

  if [ -x "/opt/homebrew/bin/brew" ]; then
    echo "/opt/homebrew/bin/brew"
    return 0
  fi

  if [ -x "/usr/local/bin/brew" ]; then
    echo "/usr/local/bin/brew"
    return 0
  fi

  return 1
}

mkdir -p "$PID_DIR" "$LOG_DIR" "$DB_DIR"

MONGO_URI="$(get_env_value "MONGO_URI" "$ENV_FILE" || true)"
ALLOW_START_WITHOUT_DB="$(get_env_value "ALLOW_START_WITHOUT_DB" "$ENV_FILE" || true)"

if [ -n "$MONGO_URI" ] && ! is_local_mongo_uri "$MONGO_URI"; then
  echo "Remote MONGO_URI detected in backend/.env; local MongoDB startup is optional."
  exit 0
fi

is_mongo_up() {
  python3 - <<'PY'
import socket
for host in ("127.0.0.1", "::1"):
    fam = socket.AF_INET6 if ":" in host else socket.AF_INET
    s = socket.socket(fam, socket.SOCK_STREAM)
    s.settimeout(0.5)
    try:
        s.connect((host, 27017))
        raise SystemExit(0)
    except Exception:
        pass
    finally:
        try: s.close()
        except Exception: pass
raise SystemExit(1)
PY
}

if is_mongo_up; then
  echo "MongoDB is already running on localhost:27017"
  exit 0
fi

BREW_BIN=""
if BREW_BIN="$(resolve_brew 2>/dev/null)"; then
  if "$BREW_BIN" services list 2>/dev/null | grep -q "mongodb-community"; then
    "$BREW_BIN" services start mongodb-community
    sleep 2
    if is_mongo_up; then
      echo "Started mongodb-community via Homebrew services."
      exit 0
    fi
  fi
fi

if [ -z "$BREW_BIN" ] && ! command -v mongod >/dev/null 2>&1; then
  if [ "$ALLOW_START_WITHOUT_DB" = "true" ]; then
    echo "Homebrew and mongod are both unavailable in PATH."
    echo "Skipping local MongoDB startup because ALLOW_START_WITHOUT_DB=true."
    echo "Run: npm run mongo:doctor"
    exit 0
  fi
  echo "Homebrew and mongod are both unavailable in PATH."
  echo "Run: npm run mongo:doctor"
fi

if command -v mongod >/dev/null 2>&1; then
  echo "Starting local mongod process for this project..."
  mongod --dbpath "$DB_DIR" --bind_ip 127.0.0.1 --port 27017 > "$LOG_DIR/mongodb.log" 2>&1 &
  MONGO_PID=$!
  echo "$MONGO_PID" > "$PID_DIR/mongodb.pid"

  sleep 2
  if is_mongo_up; then
    echo "Started local mongod (PID $MONGO_PID)"
    echo "Log: $LOG_DIR/mongodb.log"
    exit 0
  fi
fi

echo "Could not auto-start MongoDB."
echo "Install/start MongoDB manually, then retry."
echo "macOS (Homebrew):"
echo "  brew tap mongodb/brew"
echo "  brew install mongodb-community"
echo "  brew services start mongodb-community"
echo "or install mongod binary and rerun ./start_mongodb.sh"
echo "For diagnostics: npm run mongo:doctor"
exit 1
