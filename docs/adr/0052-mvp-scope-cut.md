# ADR-0052: MVP scope cut (Phase 1 / Phase 1.1)

- **Status:** Accepted
- **Date:** 2026-10-26
- **Deciders:** Frederik Schlentc
- **Area:** Providers & product
- **Spec:** [Roadmap](../architecture/09-roadmap.md)
- **Supersedes:** [ADR-0018](0018-phase-1-provider-set.md)

## Context

The goal is a daily-usable owner MVP as soon as possible. A check of the code against the Phase 1 list showed that the calendar, approvals, inbox, notifications, en/sk/cs and publishing to Bluesky, Mastodon and Instagram feed/carousel are done. The largest remaining items are video (Instagram Reels needs a whole video pipeline) and reply chains, and the daily workflow doesn't depend on either.

## Decision

**Phase 1 (MVP)** is complete when these land on top of what is done:
- Threads publishing (text, image, carousel)
- live text counters and text-limit checks in the composer
- Facebook Page
- LinkedIn personal
- nightly backups
- per-destination variants
- basic previews

**Phase 1 provider set:** Bluesky, Instagram (feed/carousel), Facebook Page, Threads, Mastodon, LinkedIn personal (+ Telegram only if ≤ 2 days).

**Phase 1.1** takes: Instagram Reels and all video, reply chains and first comment, the media library page, the jobs admin page, CLI i18n, and writing the AI label.

## Options considered

- **Chosen:** the cut above.
- Rejected: keeping the full Phase 1 list. Video and reply chains are the two largest items and would delay a usable MVP by weeks.

## Consequences

- The MVP ships without video; Instagram and Threads post types stay image/text only until Phase 1.1.
- The licensing checklist and the public release, which wait for the Phase 1 MVP, now wait for this smaller list.
- Revisit when: a design partner needs video or reply chains for daily use.
