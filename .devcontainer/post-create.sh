#!/usr/bin/env bash
set -euo pipefail

repo=/workspaces/kronaut

if [ ! -d "$repo/.git" ]; then
  git clone https://github.com/Fredyss/kronaut.git "$repo"
fi

if [ -n "${GH_TOKEN:-}" ]; then
  gh auth setup-git
fi
[ -n "${KRONAUT_GIT_NAME:-}" ] && git config --global user.name "$KRONAUT_GIT_NAME"
[ -n "${KRONAUT_GIT_EMAIL:-}" ] && git config --global user.email "$KRONAUT_GIT_EMAIL"

cd "$repo"
pnpm install --frozen-lockfile
pnpm --filter @kronaut/server exec playwright install chromium
