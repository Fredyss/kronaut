ARG NODE_BUILD_IMAGE=node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20
ARG DEBIAN_IMAGE=debian:12.14-slim@sha256:60eac759739651111db372c07be67863818726f754804b8707c90979bda511df
ARG RUNTIME_IMAGE=gcr.io/distroless/nodejs24-debian12:nonroot@sha256:14d42e2511532589a7c7e01a753667a74fcc96266e137e8125006b87b0c32d0a

FROM ${DEBIAN_IMAGE} AS pg
ARG PG_MAJOR=17
ARG PGDG_FINGERPRINT=B97B0AFCAA1A47F044F244A07FCC7D46ACCC4CF8
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg patchelf \
 && curl -fsSL -o /tmp/pgdg.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
 && gpg --show-keys --with-colons /tmp/pgdg.asc | grep -qx "fpr:::::::::${PGDG_FINGERPRINT}:" \
 && gpg --dearmor -o /usr/share/keyrings/pgdg.gpg /tmp/pgdg.asc \
 && echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends "postgresql-client-${PG_MAJOR}" \
 && rm -rf /var/lib/apt/lists/*
# Only glibc is left to the runtime image (same bookworm release); every other library the
# tools resolve is copied, and the binaries find them through an $ORIGIN rpath.
RUN set -eu; \
    mkdir -p /opt/pg/bin /opt/pg/lib; \
    for tool in pg_dump pg_restore psql; do cp "/usr/lib/postgresql/${PG_MAJOR}/bin/${tool}" /opt/pg/bin/; done; \
    dpkg -L libc6 | sed -n 's|.*/||p' | sort -u > /tmp/glibc; \
    ldd /opt/pg/bin/* | awk '$2 == "=>" && $3 ~ /^\// { print $3 }' | sort -u > /tmp/libs; \
    while read -r lib; do \
      name=$(basename "$lib"); \
      if ! grep -qxF "$name" /tmp/glibc; then cp -L "$lib" "/opt/pg/lib/$name"; fi; \
    done < /tmp/libs; \
    patchelf --force-rpath --set-rpath '$ORIGIN/../lib' /opt/pg/bin/*; \
    for lib in /opt/pg/lib/*; do patchelf --force-rpath --set-rpath '$ORIGIN' "$lib"; done; \
    for tool in /opt/pg/bin/*; do \
      if ldd "$tool" | grep -q 'not found'; then echo "unresolved library in $tool" >&2; exit 1; fi; \
      "$tool" --version; \
    done

FROM ${NODE_BUILD_IMAGE} AS deps
ARG PNPM_VERSION=12.14.0
ENV CI=true
RUN npm install --global --no-fund --no-audit "pnpm@${PNPM_VERSION}"
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/compose/package.json packages/compose/
COPY packages/contract/package.json packages/contract/
COPY packages/core/package.json packages/core/
COPY packages/credentials/package.json packages/credentials/
COPY packages/db/package.json packages/db/
COPY packages/egress/package.json packages/egress/
COPY packages/i18n/package.json packages/i18n/
COPY packages/media/package.json packages/media/
COPY packages/providers/package.json packages/providers/
COPY packages/sdk/package.json packages/sdk/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile --prod --filter '@kronaut/server...'
COPY apps/server apps/server
COPY packages packages
RUN find apps packages -name '*.test.ts' -delete \
 && rm -rf apps/web apps/server/e2e packages/sdk packages/ui packages/db/test packages/db/scripts \
 && mkdir -p /skel/data

FROM ${NODE_BUILD_IMAGE} AS web
ARG PNPM_VERSION=12.14.0
ENV CI=true
RUN npm install --global --no-fund --no-audit "pnpm@${PNPM_VERSION}"
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/contract/package.json packages/contract/
COPY packages/core/package.json packages/core/
COPY packages/i18n/package.json packages/i18n/
COPY packages/sdk/package.json packages/sdk/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile --filter '@kronaut/web...'
COPY tsconfig.base.json ./
COPY apps/web apps/web
COPY packages packages
RUN pnpm --filter @kronaut/web build \
 && test -f apps/web/dist/web/index.html \
 && ! find apps/web/dist/web -name '*.map' | grep -q .

FROM ${NODE_BUILD_IMAGE} AS notices
ARG PNPM_VERSION=12.14.0
ENV CI=true
RUN npm install --global --no-fund --no-audit "pnpm@${PNPM_VERSION}"
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/compose/package.json packages/compose/
COPY packages/contract/package.json packages/contract/
COPY packages/core/package.json packages/core/
COPY packages/credentials/package.json packages/credentials/
COPY packages/db/package.json packages/db/
COPY packages/egress/package.json packages/egress/
COPY packages/i18n/package.json packages/i18n/
COPY packages/media/package.json packages/media/
COPY packages/providers/package.json packages/providers/
COPY packages/sdk/package.json packages/sdk/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile --prod --filter '@kronaut/server...' --filter '@kronaut/web...'
COPY tools/licenses tools/licenses
RUN node tools/licenses/notices.ts /app/THIRD_PARTY_NOTICES

FROM ${RUNTIME_IMAGE}
COPY --from=pg /opt/pg /opt/pg
COPY --from=deps /app /app
COPY --from=web /app/apps/web/dist/web /app/web
COPY --from=notices /app/THIRD_PARTY_NOTICES /app/THIRD_PARTY_NOTICES
COPY LICENSE.md NOTICE /app/
COPY --from=deps --chown=65532:65532 /skel/data /data
COPY --chmod=0755 infra/docker/kronaut /usr/local/bin/kronaut
ENV PATH=/opt/pg/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    KRONAUT_DATA_DIR=/data \
    KRONAUT_WEB_DIR=/app/web
WORKDIR /app
USER 65532:65532
EXPOSE 3000
ENTRYPOINT ["/nodejs/bin/node", "/app/apps/server/src/main.ts"]
CMD ["--role=all"]
