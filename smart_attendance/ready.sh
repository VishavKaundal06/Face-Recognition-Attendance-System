#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "HPTU Attendance System Readiness Check"
echo "================================"
echo

echo "[1/3] Environment doctor"
./doctor.sh || true

echo
echo "[2/3] Runtime status"
./status.sh || true

echo
echo "[3/3] API smoke"
./smoke.sh || true

echo
echo "Done."
echo "If backend is degraded, connect MongoDB (local/remote) for full API support."
