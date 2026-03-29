#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_ENV="$ROOT_DIR/backend/.env"

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

cd "$ROOT_DIR"

echo "Starting HPTU Attendance System stack..."

MONGO_URI="$(get_env_value "MONGO_URI" "$BACKEND_ENV" || true)"
ALLOW_START_WITHOUT_DB="$(get_env_value "ALLOW_START_WITHOUT_DB" "$BACKEND_ENV" || true)"

if [ "$ALLOW_START_WITHOUT_DB" = "true" ]; then
  echo "ALLOW_START_WITHOUT_DB=true; skipping local MongoDB startup."
elif [ -z "$MONGO_URI" ] || is_local_mongo_uri "$MONGO_URI"; then
  if ! ./start_mongodb.sh; then
    echo "MongoDB startup failed."
    echo "Resolve MongoDB setup, then run: npm run up"
    exit 1
  fi
else
  echo "Detected remote MongoDB URI; skipping local MongoDB startup."
fi

./start_all.sh
