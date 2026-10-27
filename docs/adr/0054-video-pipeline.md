# ADR-0054: Video upload, conversion and publishing

- **Status:** Accepted
- **Date:** 2026-10-27
- **Deciders:** Frederik Schlentc
- **Area:** Media, providers
- **Spec:** [Media](../architecture/07-media.md), [Provider contract](../architecture/03-provider-contract.md), [Frontend](../architecture/08-frontend.md), [Licensing](../architecture/12-licensing.md), [Provider facts](../reference/provider-facts.md)

## Context

Phase 1.1 adds video for every provider, Instagram Reels first (ADR-0052). Images upload as one base64 JSON body capped at 12 MiB, and the server re-encodes them in process with sharp. That doesn't scale to video:

- Cloudflare caps a proxied request body at 100 MB on the Free and Pro plans, and the app is reached through the tunnel. A video upload must be split.
- Instagram and Threads accept only MOV or MP4 with the moov atom at the front, no edit lists, H.264 or HEVC, a closed GOP, 4:2:0 and a constant 23–60 fps (M2, T2). Phone recordings often break this: iPhones default to HEVC, variable frame rate and HDR. Bluesky takes only `video/mp4`, and Facebook Reels want H.264/H.265 at 24–60 fps.
- The provider facts checked on 2026-10-27 show that one H.264/AAC MP4 built to the strictest common profile satisfies every network except where size, duration or aspect limits differ.
- [Licensing](../architecture/12-licensing.md) already allows ffmpeg as a separate subprocess running a stock binary, never linked.

## Decision

**Every uploaded video is converted on the server, in a background job, into one H.264/AAC MP4 master. Providers publish that master unchanged. Uploads are chunked, and the source is at most 300 MB.**

### Upload

- `POST /v1/workspaces/:workspaceId/media/uploads` with `{kind: 'video', bytes, mime, filename?, aiGenerated?}`, under `media:write` with an idempotency key.
  - It refuses `bytes` over 300 MB (`file_too_large`) and a `mime` other than `video/mp4`, `video/quicktime` or `video/webm` (`mime_unsupported`).
  - It inserts a `media_assets` row in state `uploading` with a random 64-hex staging `storage_key`, and returns `{media, partSize, partCount, expiresAt}`.
  - `partSize` is 8 MiB, and an upload expires after 24 h.
- `PUT /v1/workspaces/:workspaceId/media/:mediaId/parts/:n` takes a raw `application/octet-stream` body.
  - Every part but the last is exactly `partSize`; the body limit is `partSize`.
  - A repeat of the same part replaces it. Parts are files under the asset's staging directory, so no table tracks them.
- `POST /v1/workspaces/:workspaceId/media/:mediaId/complete` checks that every part is present and that the total equals `bytes`. It then sets the state to `processing` and enqueues a `media_process` job (job key `media:<id>`). Calling it again is a no-op.
- The orphaned-upload GC (7 d, [Media](../architecture/07-media.md)) also removes `uploading` rows older than their 24 h expiry, together with their staging files.

### Conversion

- The job runs `ffprobe` on the joined source, then `ffmpeg`, each as a subprocess with an argument array, never a shell.
- **It rejects the source** (state `rejected`, with a reason in the new `media_assets.rejected_reason`) when:
  - there is no video stream: `video_stream_missing`;
  - the duration is under 3 s or over 15 min: `video_too_short`, `video_too_long`;
  - ffprobe or ffmpeg fails: `video_unreadable`;
  - the master would exceed 300 MB: `video_too_large`.
- **Master profile**, the strictest common denominator of the shipped networks:
  - MP4 with `+faststart` and no edit lists;
  - H.264 High, yuv420p, 8-bit SDR BT.709. HDR sources are converted, not tone-mapped.
  - Rotation is applied to the pixels. The longest side is at most 1920 px, and the video is never upscaled.
  - Constant frame rate: the source rate clamped to 24–60 fps, 30 when unknown.
  - Closed GOP of 2 s, CRF 21, capped at 8 Mbps.
  - AAC-LC 48 kHz stereo at 128 kbps when the source has audio; no audio track otherwise.
- **On success:**
  - The master is stored under its sha256 key ([ADR-0023](0023-tenant-scoped-media-storage-keys.md)). The row becomes `ready` with `mime` `video/mp4`, `bytes`, `width`, `height` and `duration_ms`.
  - A WebP poster frame is stored as the `thumb_768` rendition for previews.
  - The source and staging files are deleted at once; only the master is referenced by approvals and hashes.
- **Resource limits:** one conversion at a time per worker, `-threads 2`, run at a lower priority, with a 20-minute timeout. A timeout rejects the source as `video_unreadable`.

### Binaries

- `ffmpeg` and `ffprobe` are built in a Docker stage from pinned upstream release tarballs of FFmpeg and x264, each checked against a sha256 recorded in the Dockerfile.
- The build is a minimal configuration: the decoders, demuxers and filters for MP4, MOV and WebM input, plus `libx264`, the native AAC encoder and the MP4 muxer.
- The two binaries are copied into the runtime image under `/opt/ffmpeg`. The build is GPL because of x264; it runs as a subprocess and is never linked.
- `THIRD_PARTY_NOTICES` names both projects, their licences and the exact source tarball URLs and hashes.

### Serving

- The media server answers `Range` requests with 206 for video.
- Signed URLs for video live about 6 h, as [Media](../architecture/07-media.md) already says.

### Publishing

- A post carries either images or one video, never both, and no carousel holds a video in this round.
- Manifests describe video per post type: duration, size, and aspect bounds where a network documents them. Compose validates against the master's metadata.
- **Rollout, one PR each:**
  1. Instagram Reels (`share_to_feed: true`).
  2. Threads video, with alt text.
  3. Mastodon, refused in compose when the master exceeds the instance's `video_size_limit`, `video_frame_rate_limit` or `video_matrix_limit`.
  4. Bluesky, through the video service. Its OAuth service-auth needs a live test first; if the service refuses OAuth sessions, Bluesky shows video as not supported.
  5. LinkedIn, through the Videos API in 4 MiB parts.
  6. Facebook Pages, **as Reels only**: 3–90 s, vertical, at most 30 per Page per 24 h. Feed videos through `/{page-id}/videos` are not offered.
- Covers and captions aren't set; every network falls back to its own frame.

## Options considered

- **Chosen:** the decision above. One converted master serves every network and keeps approval hashes simple.
- **Rejected: check only, no conversion.** This needs a smaller image and no CPU, but most phone recordings would be refused until the user exports them again.
- **Rejected: per-network renditions.** The facts show one profile fits every shipped network, so a rendition per network would only add storage and hash complexity. Revisit if a network needs a profile the master can't meet.
- **Rejected: Debian's `ffmpeg` package copied into the distroless image.** It pulls in a large library tree that the image scan would flag, for codecs Kronaut never uses.
- **Rejected: an upload limit of 1 GB.** Only Threads, LinkedIn and Facebook would take files over 300 MB, and conversion shrinks most of them anyway.
- **Rejected for now: Facebook feed videos.** Their size and duration limits are undocumented, and the docs contradict each other about the upload host (M59, M64).

## Consequences

- Any phone video works, at the cost of a larger image and about a minute or two of worker CPU per short video.
- One migration adds `media_assets.rejected_reason` (text with a CHECK on the codes above).
- The image scan can't see the ffmpeg build's version. FFmpeg and x264 security releases are tracked by hand, and their pins bumped like any other base image.
- Distributing a GPL binary in the image carries a source obligation; the notices record the exact sources. This is one of the licensing items to confirm with a lawyer.
- Revisit when: a network needs a different profile; carousel video, covers or captions are added; Facebook documents feed-video limits; or the SaaS mode moves uploads to presigned multipart on R2 ([Media](../architecture/07-media.md)).
