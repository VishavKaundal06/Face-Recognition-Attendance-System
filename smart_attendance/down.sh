#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT_DIR"

echo "Stopping Smart Attendance stack..."
./stop_all.sh || true
./stop_mongodb.sh || true

echo "Done."
