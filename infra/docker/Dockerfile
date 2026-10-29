FROM debian:13.7-slim@sha256:62bd423aeee912639ca8ee681c2b762cb3e25137e0a92b20be455898a9f034ad AS pg
ARG PG_MAJOR=17
ARG PGDG_FINGERPRINT=B97B0AFCAA1A47F044F244A07FCC7D46ACCC4CF8
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg patchelf \
 && curl -fsSL -o /tmp/pgdg.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
 && gpg --show-keys --with-colons /tmp/pgdg.asc | grep -qx "fpr:::::::::${PGDG_FINGERPRINT}:" \
 && gpg --dearmor -o /usr/share/keyrings/pgdg.gpg /tmp/pgdg.asc \
 && echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] https://apt.postgresql.org/pub/repos/apt trixie-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends "postgresql-client-${PG_MAJOR}" \
 && rm -rf /var/lib/apt/lists/*
# Only glibc is left to the runtime image (same trixie release); every other library the
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

FROM debian:13.7-slim@sha256:62bd423aeee912639ca8ee681c2b762cb3e25137e0a92b20be455898a9f034ad AS ffmpeg
ARG X264_COMMIT=b35605ace3ddf7c1a5d67a2eb553f034aef41d55
ARG X264_URL=https://code.videolan.org/videolan/x264/-/archive/${X264_COMMIT}/x264-${X264_COMMIT}.tar.gz
ARG X264_SHA256=cd71a7515b0e9a012e1ac9b1f8415bebcaf6fc97d4db32286642ac4c0fbe24f9
ARG FFMPEG_VERSION=9.0.2
ARG FFMPEG_URL=https://ffmpeg.org/releases/ffmpeg-${FFMPEG_VERSION}.tar.xz
ARG FFMPEG_MIRROR_URL=https://deb.debian.org/debian/pool/main/f/ffmpeg/ffmpeg_${FFMPEG_VERSION}.orig.tar.xz
ARG FFMPEG_SHA256=8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gcc libc6-dev make nasm pkgconf xz-utils \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /src
RUN set -eu; \
    curl -fsSL -o x264.tar.gz "${X264_URL}"; \
    echo "${X264_SHA256}  x264.tar.gz" | sha256sum -c -; \
    mkdir x264; \
    tar -xzf x264.tar.gz -C x264 --strip-components=1; \
    cd x264; \
    ./configure --prefix=/opt/x264 --enable-static --disable-cli --enable-pic --bit-depth=8 --disable-opencl; \
    make -j"$(nproc)"; \
    make install-lib-static; \
    install -D -m 0644 COPYING /opt/ffmpeg/licenses/x264-COPYING
RUN set -eu; \
    curl -fsSL --retry 3 --retry-all-errors -o ffmpeg.tar.xz "${FFMPEG_URL}" \
      || curl -fsSL --retry 3 --retry-all-errors -o ffmpeg.tar.xz "${FFMPEG_MIRROR_URL}"; \
    echo "${FFMPEG_SHA256}  ffmpeg.tar.xz" | sha256sum -c -; \
    mkdir ffmpeg; \
    tar -xJf ffmpeg.tar.xz -C ffmpeg --strip-components=1; \
    cd ffmpeg; \
    PKG_CONFIG_PATH=/opt/x264/lib/pkgconfig ./configure \
      --pkg-config-flags=--static \
      --disable-shared --enable-static \
      --disable-everything --disable-autodetect --disable-network --disable-doc --disable-debug --disable-ffplay \
      --enable-ffmpeg --enable-ffprobe \
      --enable-gpl --enable-libx264 \
      --enable-swscale --enable-swresample \
      --enable-protocol=file,pipe \
      --enable-demuxer=mov,matroska \
      --enable-muxer=mp4,image2pipe \
      --enable-decoder=h264,hevc,vp8,vp9,mjpeg \
      --enable-decoder=aac,aac_latm,mp3,mp3float,opus,vorbis,flac,alac,ac3,eac3 \
      --enable-decoder=pcm_s16le,pcm_s16be,pcm_s24le,pcm_s24be,pcm_s32le,pcm_f32le,pcm_f32be \
      --enable-encoder=libx264,aac,mjpeg \
      --enable-parser=h264,hevc,aac,aac_latm,vp8,vp9,opus,vorbis,mpegaudio,ac3,flac,mjpeg \
      --enable-filter=scale,format,fps,setsar,transpose,hflip,vflip,null,anull,aresample,aformat,crop; \
    make -j"$(nproc)"; \
    install -D -m 0755 -t /opt/ffmpeg/bin ffmpeg ffprobe; \
    install -D -m 0644 COPYING.GPLv2 /opt/ffmpeg/licenses/FFmpeg-COPYING.GPLv2
RUN set -eu; \
    for tool in /opt/ffmpeg/bin/*; do \
      extra=$(ldd "$tool" | awk '{ print $1 }' | grep -vE '^(linux-vdso\.so\.1|libc\.so\.6|libm\.so\.6|libpthread\.so\.0|libdl\.so\.2|/lib(64)?/ld-linux[-a-z0-9_]*\.so\.[0-9]+)$' || true); \
      if [ -n "$extra" ]; then echo "unexpected library in $tool: $extra" >&2; exit 1; fi; \
    done; \
    /opt/ffmpeg/bin/ffmpeg -hide_banner -encoders | awk '{ print $2 }' > /tmp/encoders; \
    for enc in libx264 aac mjpeg; do grep -qxF "$enc" /tmp/encoders || { echo "missing encoder $enc" >&2; exit 1; }; done; \
    /opt/ffmpeg/bin/ffmpeg -hide_banner -muxers | awk '{ print $2 }' | grep -qxF mp4 || { echo "missing muxer mp4" >&2; exit 1; }; \
    /opt/ffmpeg/bin/ffprobe -version

FROM node:24.21.0-trixie-slim@sha256:173f125896c3b47ddf056734c7ea789d04595a6a08769a8f78e0df642781fb66 AS node-build

FROM node-build AS deps
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

FROM node-build AS web
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

FROM node-build AS notices
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

FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:cb606325b7ec4af55462cb0b424a53b452a5b4a894ffe841fcf1048d216fb9f8
COPY --from=pg /opt/pg /opt/pg
COPY --from=ffmpeg /opt/ffmpeg /opt/ffmpeg
COPY --from=deps /app /app
COPY --from=web /app/apps/web/dist/web /app/web
COPY --from=notices /app/THIRD_PARTY_NOTICES /app/THIRD_PARTY_NOTICES
COPY LICENSE.md NOTICE /app/
COPY --from=deps --chown=65532:65532 /skel/data /data
COPY --chmod=0755 infra/docker/kronaut /usr/local/bin/kronaut
ENV PATH=/opt/ffmpeg/bin:/opt/pg/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    KRONAUT_DATA_DIR=/data \
    KRONAUT_WEB_DIR=/app/web
WORKDIR /app
USER 65532:65532
EXPOSE 3000
ENTRYPOINT ["/nodejs/bin/node", "/app/apps/server/src/main.ts"]
CMD ["--role=all"]
