# Claude Code dev container

A container where Claude Code works on Kronaut without permission prompts. The container is the safety boundary instead of the per-command sandbox in `.claude/settings.json`, so Claude can run `pnpm check`, `pnpm test:db`, `pnpm test:e2e`, push branches and open pull requests on its own.

It follows the [Claude Code dev container reference](https://code.claude.com/docs/en/devcontainer), with Docker inside the container for testcontainers.

## What is inside

- Node 24, pnpm (corepack), `gh`, Claude Code, Chromium for Playwright.
- Docker in Docker (the `docker-in-docker` dev container feature, which runs the container privileged). On macOS the container runs inside Docker Desktop's Linux VM, so it never reaches the Mac directly.
- Its own clone of the repository in a Docker volume. Nothing from the host checkout is mounted, so no `.env`, `secrets/` or `data/` from the host is visible.
- An egress firewall (`firewall.sh`, run at every start and again by `claude.sh` before Claude launches, which aborts if it fails): GitHub, npm, Anthropic, Docker Hub, Playwright downloads and the official provider docs in `allowed-domains.txt`. Everything else is rejected, including DNS to anything but the container's resolver and the local network apart from the Docker Desktop host. To add a domain, edit the file and rebuild the container. `sudo /usr/local/share/kronaut/firewall.sh` inside the container refreshes the addresses.
- `managed-settings.json` turns the sandbox off inside the container and denies the usual forms of merging or closing pull requests, `gh api|repo|secret|release|auth`, and reads of secret files. A push may only be `git push <remote> <branch>`: no flags, no `:` or `+` refspecs, no `main`, and no `git -C` or `git -c` in front, so set an upstream with `git branch --set-upstream-to` instead of `push -u`. These rules match command prefixes, so they catch slips, not every spelling of a push or merge. The `main` ruleset on GitHub is what actually blocks a merge without review, so its bypass list must not include the token's user.

## One-time setup

1. Docker Desktop running on the host.
2. A fine-grained GitHub token for `Fredyss/kronaut` only: Contents read/write, Pull requests read/write, Metadata read. Store it in the macOS keychain:

   ```sh
   security add-generic-password -s kronaut-claude-gh -a "$USER" -w
   ```

   Or export `KRONAUT_GH_TOKEN` instead.

## Run

```sh
.devcontainer/claude.sh            # build or start the container, then Claude Code
.devcontainer/claude.sh -p "..."   # a one-shot prompt
.devcontainer/claude.sh shell      # a shell inside
.devcontainer/claude.sh rebuild    # recreate the container after a change in .devcontainer/, then Claude Code
```

The volumes (repository, Claude login, Docker images) survive `rebuild`.

The first run builds the image, clones the repository, installs dependencies and asks you to sign in to Claude.

Each run copies `~/.claude/CLAUDE.md`, `~/.claude/agents` and `~/.claude/skills` into the container and bind-mounts this project's Claude memory folder, so instructions and memory match the host. Commits use the host's `git config user.name` and `user.email`.

## Limits

- Anything inside the container can read the GitHub token and the Claude login. Keep the token scoped to this repository.
- The firewall guards against mistakes, not against a determined agent: the `docker` group is root inside the container, so a process there could start a privileged container and change the rules. The token scope and the `main` ruleset are the hard limits.
- Docker Hub serves layers from a CDN whose addresses change. If a pull fails, run the firewall script again.
- Plugins installed on the host are not copied; install them inside if needed.
