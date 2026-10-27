# Build phases

**Phase 0: Spine** (gate: **Bluesky + Instagram** image/carousel publish end-to-end, ADR-0017; fallback Bluesky + Mastodon if Meta access is blocked for more than 2 weeks)

- **Repo:**
  - monorepo, LICENSE + NOTICE, signed commits
  - compose
  - **the full `packages/db/schema/v1.sql` + its smoke checks as CI tests** (ADR-0041)
- **Owner tooling:** owner CLI (create/reset/export/import), sessions + CF Access JWT.
- **Platform core:**
  - `defineRoute` + `authorize()`
  - egress
  - envelope credential vault
  - storage + media role, with the public hostname check
- **Publishing:**
  - state machine with CAS + write-ahead + reaper + reconciliation + refresh lease + restore quarantine
  - webhook events written (no UI)
- **Ops and tests:** healthchecks, pino, canary + route-enumeration tests.
- **Measure:** IG container timings and media fetch windows.

**Phase 1: Daily-usable owner MVP** (scope cut in ADR-0052)

- **Done:**
  - calendar drag and undo, with Temporal wall-time math
  - approval policy + approval step with step-up
  - needs-action inbox with "Send again"
  - notifications (in-app + SMTP): failed, needs_reauth, expiring, approval requested, awaiting_manual
  - media validation, re-encode and alt text
  - UI and emails in English, Slovak and Czech
  - providers: Bluesky, Instagram (feed/carousel), Mastodon, Threads (text, image, carousel)
  - editor: live text counters and text-limit checks
  - nightly backups with the 7 + 4 rotation and a restore test through quarantine
- **Remaining for the MVP:**
  - editor: per-destination variants, basic previews
  - providers: Facebook Page, LinkedIn personal (Telegram only if it fits in ≤ 2 days)
- **App reviews:** start the Meta/LinkedIn/TikTok/Google platform reviews **at the Phase 1 release**; reviews take weeks and require a working product.

**Phase 1.1**

- **Video:** Instagram Reels and video for every provider.
- **Editor:** threads (reply chains) and first comment; the remaining platform-mandated UX.
- **Media library page.**
- **Ops:** jobs admin page; DST tests for the calendar; provider API version sunset alarm (LinkedIn).
- **Languages:** the CLI in English, Slovak and Czech.
- **AI label:** set `ai_generated` on media and send it to the providers that support it.

**Phase 2: Feature parity**

- **Providers:** YouTube, TikTok (hosted-only in practice), X, Pinterest, LinkedIn Page (CMA, needs a legal org), Google Business Profile, Discord, Reddit. Then the long tail on demand: Lemmy, WordPress, dev.to, Hashnode, Medium, Tumblr, Nostr, Farcaster, Slack…
- **Planning and content tools:**
  - Analytics snapshots.
  - Queue slots / "add to queue".
  - Recurring/evergreen posts.
  - Tags, signatures, templates.
  - Brand UI and account groups.
  - CSV bulk import.
  - RSS autopost.
  - Short-link adapter (Dub/Kutt).
- **Collaboration:** review links with comments + OTP.
- **Integrations:**
  - Webhooks UI.
  - Public API + grants UI + per-grant rate limits.
  - MCP (13 tools).
  - AI (per-network rewrite, hashtags, alt text, optional image gen).
- **Admin:**
  - Per-provider **developer-app setup wizard** with availability caveats.
  - Meta data-deletion callback.
  - Audit seal job.
- **Locales:** further locales (pl, de, …) on demand.

**Phase 3: SaaS**

- `MODE=saas` registration + invites.
- Organizations with many workspaces (agency = 1 workspace per client).
- Stripe on top of the entitlements seam.
- Location UI.
- Infrastructure: R2 + Worker media, split fetcher + media-worker containers.
- MCP OAuth/DCR (grant kind `oauth`).
- OTel, PWA, a status page.
- RLS stays `ENABLE` with the non-owner role (already in place since Phase 0); there is no FORCE migration.
