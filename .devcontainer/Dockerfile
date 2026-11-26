FROM node:24-bookworm

ARG CLAUDE_CODE_VERSION=latest
ARG PLAYWRIGHT_VERSION=1.65.1

RUN apt-get update && apt-get install -y --no-install-recommends \
    aggregate ca-certificates curl dnsutils git gnupg ipset iproute2 iptables jq less procps sudo zsh \
  && install -m 0755 -d /etc/apt/keyrings \
  && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /etc/apt/keyrings/githubcli.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli.gpg] https://cli.github.com/packages stable main" \
    > /etc/apt/sources.list.d/github-cli.list \
  && apt-get update && apt-get install -y --no-install-recommends gh \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
  && npm install -g "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" \
  && npx -y "playwright@${PLAYWRIGHT_VERSION}" install-deps chromium \
  && rm -rf /var/lib/apt/lists/* /root/.npm

COPY firewall.sh post-create.sh allowed-domains.txt /usr/local/share/kronaut/
COPY managed-settings.json /etc/claude-code/managed-settings.json
RUN chmod 0755 /usr/local/share/kronaut/firewall.sh /usr/local/share/kronaut/post-create.sh \
  && echo "node ALL=(root) NOPASSWD: /usr/local/share/kronaut/firewall.sh" > /etc/sudoers.d/node-firewall \
  && chmod 0440 /etc/sudoers.d/node-firewall \
  && mkdir -p /workspaces/kronaut /home/node/.claude \
  && chown -R node:node /workspaces /home/node/.claude

USER node
ENV CLAUDE_CONFIG_DIR=/home/node/.claude \
    TESTCONTAINERS_RYUK_DISABLED=true
