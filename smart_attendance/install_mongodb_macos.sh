#!/usr/bin/env bash
set -euo pipefail

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

BREW_BIN=""
if ! BREW_BIN="$(resolve_brew 2>/dev/null)"; then
  echo "Homebrew is not installed. Install Homebrew first: https://brew.sh"
  exit 1
fi

echo "Using Homebrew: $BREW_BIN"

"$BREW_BIN" tap mongodb/brew
"$BREW_BIN" install mongodb-community
"$BREW_BIN" services start mongodb-community

echo "MongoDB installation/start attempted."
echo "Run: npm run mongo:doctor"
