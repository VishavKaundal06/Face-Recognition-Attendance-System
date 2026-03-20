#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
ENV_FILE="$BACKEND_DIR/.env"

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

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found. Install Node.js/npm and retry."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found. Install Python 3 and retry."
  exit 1
fi

check_mongo_ready() {
  python3 - <<'PY'
import socket
for host in ("127.0.0.1", "::1"):
    family = socket.AF_INET6 if ":" in host else socket.AF_INET
    s = socket.socket(family, socket.SOCK_STREAM)
    s.settimeout(0.5)
    try:
        s.connect((host, 27017))
        s.close()
        raise SystemExit(0)
    except Exception:
        pass
    finally:
        try:
            s.close()
        except Exception:
            pass
raise SystemExit(1)
PY
}

if [ ! -f "$ENV_FILE" ]; then
  cp "$BACKEND_DIR/.env.example" "$ENV_FILE"
fi

MONGO_URI="$(get_env_value "MONGO_URI" "$ENV_FILE" || true)"
ALLOW_START_WITHOUT_DB="$(get_env_value "ALLOW_START_WITHOUT_DB" "$ENV_FILE" || true)"

if [ -z "$MONGO_URI" ]; then
  echo "MONGO_URI is missing in backend/.env"
  echo "Set it first, then retry ./create_admin.sh"
  exit 1
fi

if is_local_mongo_uri "$MONGO_URI"; then
  if ! check_mongo_ready; then
    echo "MongoDB is not running on localhost:27017."
    echo "Create admin requires a working database connection."
    if [ "$ALLOW_START_WITHOUT_DB" = "true" ]; then
      echo "Note: backend degraded mode is enabled, but create-admin still needs MongoDB."
    fi
    echo "Start MongoDB first, then retry ./create_admin.sh"
    echo "Example (macOS with Homebrew): brew services start mongodb-community"
    exit 1
  fi
else
  echo "Remote MongoDB URI detected; attempting admin creation using remote DB."
fi

npm --prefix "$BACKEND_DIR" run create-admin -- "$@"
