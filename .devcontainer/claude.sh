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

up_flags=()
if [ "${1:-}" = "rebuild" ]; then
  up_flags+=(--remove-existing-container)
  shift
fi

up="$("${cli[@]}" up --workspace-folder "$here" ${up_flags[@]+"${up_flags[@]}"} \
  --mount "type=bind,source=$memory,target=/home/node/.claude/projects/-workspaces-kronaut/memory")"
container="$(printf '%s' "$up" | sed -n 's/.*"containerId":"\([^"]*\)".*/\1/p')"
if [ -z "$container" ]; then
  printf '%s\n' "$up" >&2
  exit 1
fi

# Piping tar into devcontainer exec fails with "tar: Write error", so stage and docker cp.
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
for item in CLAUDE.md agents skills; do
  if [ -e "$HOME/.claude/$item" ]; then
    cp -R "$HOME/.claude/$item" "$stage/"
  fi
done
rm -rf "$stage/skills/cache" "$stage/skills/data" "$stage/skills/blocklist.json"
find "$stage" -name .DS_Store -delete
docker cp "$stage/." "$container:/home/node/.claude/"
docker exec -u root "$container" sh -c \
  'cd /home/node/.claude && chown -R node:node CLAUDE.md agents skills 2>/dev/null; chown node:node projects projects/-workspaces-kronaut'
# postStartCommand runs once per container start, so a failed run would leave a running container without the firewall.
docker exec -u root "$container" /usr/local/share/kronaut/firewall.sh

if [ "${1:-}" = "shell" ]; then
  "${cli[@]}" exec --workspace-folder "$here" bash
else
  "${cli[@]}" exec --workspace-folder "$here" claude --dangerously-skip-permissions "$@"
fi
