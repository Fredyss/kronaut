#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)"
main="$(cd "$(git -C "$here" rev-parse --path-format=absolute --git-common-dir)/.." && pwd)"
cli=(npx -y @devcontainers/cli@0)

if [ -z "${KRONAUT_GH_TOKEN:-}" ] && command -v security >/dev/null; then
  KRONAUT_GH_TOKEN="$(security find-generic-password -s kronaut-claude-gh -w 2>/dev/null || true)"
fi
if [ -z "${KRONAUT_GH_TOKEN:-}" ]; then
  echo "Set KRONAUT_GH_TOKEN or store it: security add-generic-password -s kronaut-claude-gh -a \"\$USER\" -w" >&2
  exit 1
fi
export KRONAUT_GH_TOKEN
export KRONAUT_GIT_NAME="${KRONAUT_GIT_NAME:-$(git -C "$main" config user.name)}"
export KRONAUT_GIT_EMAIL="${KRONAUT_GIT_EMAIL:-$(git -C "$main" config user.email)}"

# Claude keys a project's memory by its path with every non-alphanumeric turned into a dash.
memory="$HOME/.claude/projects/$(printf '%s' "$main" | sed 's/[^a-zA-Z0-9]/-/g')/memory"
mkdir -p "$memory"

"${cli[@]}" up --workspace-folder "$here" \
  --mount "type=bind,source=$memory,target=/home/node/.claude/projects/-workspaces-kronaut/memory" >&2

if [ -d "$HOME/.claude" ]; then
  COPYFILE_DISABLE=1 tar -C "$HOME/.claude" --exclude 'skills/cache' --exclude 'skills/data' --exclude 'skills/blocklist.json' \
    -cf - $(cd "$HOME/.claude" && ls -d CLAUDE.md agents skills 2>/dev/null) \
    | "${cli[@]}" exec --workspace-folder "$here" tar -C /home/node/.claude -xf -
fi

if [ "${1:-}" = "shell" ]; then
  exec "${cli[@]}" exec --workspace-folder "$here" bash
fi
exec "${cli[@]}" exec --workspace-folder "$here" claude --dangerously-skip-permissions "$@"
