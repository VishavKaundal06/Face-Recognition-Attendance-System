#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT_DIR/logs"

mkdir -p "$LOG_DIR"

echo "Tailing logs (Ctrl+C to exit)..."

touch "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log" "$LOG_DIR/admin.log"

tail -n 80 -f "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log" "$LOG_DIR/admin.log"
