#!/usr/bin/env bash
set -euo pipefail

if command -v brew >/dev/null 2>&1; then
  echo "Homebrew is already installed: $(command -v brew)"
  brew --version | head -n 1
  exit 0
fi

echo "Installing Homebrew (macOS)..."
echo "You may be prompted for your macOS password."

NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

if [ -x "/opt/homebrew/bin/brew" ]; then
  echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile"
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -x "/usr/local/bin/brew" ]; then
  echo 'eval "$(/usr/local/bin/brew shellenv)"' >> "$HOME/.zprofile"
  eval "$(/usr/local/bin/brew shellenv)"
fi

echo "Homebrew installed."
echo "Run: brew --version"
