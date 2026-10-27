# Architecture decision records

One-way doors: decisions that are expensive to change once code exists. Anything not listed here is a [two-way door](#two-way-doors) and is decided while building.

**Rules**

- ADRs are immutable once accepted. To change one, add a new ADR that supersedes it and set the old one's status to `Superseded by ADR-NNNN`.
- ADRs win over `docs/architecture/` when they conflict. [`packages/db/schema/v1.sql`](../../packages/db/schema/v1.sql) is the normative v1 schema.
- New ADRs use [the template](template.md) and the next free number.

## Tenancy & data

| ADR | Decision |
|---|---|
| [0001](0001-workspace-is-the-only-isolation-boundary.md) | Workspace is the only isolation boundary |
| [0002](0002-brand-and-location-are-context-not-authorization.md) | Brand and location are context, not authorization |
| [0003](0003-row-level-security-enabled-from-v1.md) | Row-level security enabled from v1 |
| [0004](0004-composite-tenant-keys.md) | Composite tenant keys |
| [0005](0005-uuidv7-internally-prefixed-ids-at-the-api.md) | UUIDv7 internally, prefixed ids at the API |
| [0006](0006-text-with-check-constraints-instead-of-enums.md) | Text with CHECK constraints instead of enums |
| [0023](0023-tenant-scoped-media-storage-keys.md) | Tenant-scoped media storage keys |
| [0024](0024-expand-deploy-contract-migrations.md) | Expand, deploy, contract migrations |
| [0041](0041-phase-0-ships-the-full-v1-schema.md) | Phase 0 ships the full v1 schema |
| [0044](0044-least-privilege-global-tables-and-cross-tenant-entry-points.md) | ~~Least-privilege global tables and bounded cross-tenant entry points~~ Superseded by 0048 |
| [0046](0046-job-queue-schema-owned-by-the-migration-role.md) | Job queue schema owned by the migration role |
| [0048](0048-least-privilege-global-tables-and-cross-tenant-entry-points-revised.md) | Least-privilege global tables and bounded cross-tenant entry points (revised) |

## Content & approval

| ADR | Decision |
|---|---|
| [0010](0010-per-destination-content-hash-and-canonicalisation.md) | Per-destination content hash and canonicalisation |
| [0011](0011-schedule-bound-as-columns.md) | Schedule bound as columns |
| [0012](0012-agent-authorship-derived-in-the-database.md) | Agent authorship derived in the database |
| [0016](0016-client-review-links.md) | Client review links |
| [0033](0033-post-and-variant-model.md) | Post and variant model |
| [0042](0042-approval-policy-defaults.md) | Approval policy defaults |

## Publishing pipeline

| ADR | Decision |
|---|---|
| [0007](0007-eleven-destination-states.md) | Eleven destination states |
| [0008](0008-write-ahead-public-send-marker.md) | Write-ahead public send marker |
| [0009](0009-token-refresh-lease.md) | Token refresh lease |
| [0020](0020-restore-quarantine-and-instance-fencing.md) | Restore quarantine and instance fencing |
| [0022](0022-provider-rate-buckets-in-postgres.md) | Provider rate buckets in Postgres |
| [0031](0031-outgoing-webhooks.md) | Outgoing webhooks |
| [0032](0032-providererror-contract.md) | ProviderError contract |
| [0034](0034-delivery-mode-and-manual-reminders.md) | Delivery mode and manual reminders |

## Identity, agents & security

| ADR | Decision |
|---|---|
| [0013](0013-access-grants-and-grant-tokens.md) | Access grants and grant tokens |
| [0014](0014-explicit-resource-scope.md) | Explicit resource scope |
| [0015](0015-insert-only-audit-log.md) | Insert-only audit log |
| [0019](0019-entitlements-boundary.md) | Entitlements boundary |
| [0021](0021-credential-envelope-encryption.md) | Credential envelope encryption |
| [0026](0026-principal-types.md) | Principal types |
| [0027](0027-frozen-scope-vocabulary.md) | Frozen scope vocabulary |
| [0028](0028-roles-and-the-approval-flag.md) | Roles and the approval flag |
| [0029](0029-single-authorization-function.md) | Single authorization function |
| [0030](0030-frozen-mcp-tool-set.md) | Frozen MCP tool set |
| [0039](0039-server-side-ai-has-zero-tools.md) | Server-side AI has zero tools |
| [0040](0040-idempotency-keys-for-every-write.md) | Idempotency keys for every write |
| [0045](0045-audit-partition-maintenance-in-the-database.md) | Audit partition maintenance in the database |

## Providers & product

| ADR | Decision |
|---|---|
| [0017](0017-phase-0-gate-bluesky-and-instagram.md) | Phase 0 gate: Bluesky and Instagram |
| [0018](0018-phase-1-provider-set.md) | ~~Phase 1 provider set~~ Superseded by 0052 |
| [0025](0025-owner-first-product-with-agency-seams.md) | Owner-first product with agency seams |
| [0035](0035-bluesky-confidential-oauth-client.md) | Bluesky confidential OAuth client |
| [0036](0036-provider-manifest-contract.md) | Provider manifest contract |
| [0037](0037-analytics-snapshots.md) | Analytics snapshots |
| [0038](0038-localised-provider-errors.md) | Localised provider errors |
| [0043](0043-effective-provider-availability.md) | Effective provider availability |
| [0047](0047-bluesky-client-signing-keys.md) | ~~Bluesky client signing keys~~ Superseded by 0050 |
| [0049](0049-oauth-channel-connect-flow.md) | ~~OAuth channel connect flow~~ Superseded by 0053 |
| [0050](0050-bluesky-client-signing-keys-revised.md) | Bluesky client signing keys (revised) |
| [0051](0051-per-instance-oauth-apps.md) | Per-instance OAuth apps (Mastodon), extends 0049 |
| [0052](0052-mvp-scope-cut.md) | MVP scope cut: Phase 1 and Phase 1.1 |
| [0053](0053-multi-account-channel-connect.md) | One connect can add several channels (supersedes 0049) |
| [0054](0054-video-pipeline.md) | Video upload, conversion and publishing |

## Defaults

Two-way values chosen up front; the owner may override any of them.

| Topic | Default |
|---|---|
| Self-approval | false; onboarding sets true for single-member workspaces ([ADR-0042](0042-approval-policy-defaults.md)) |
| Reschedule tolerance | 0 min ([ADR-0042](0042-approval-policy-defaults.md)) |
| Workspace deletion | deletes the workspace's audit rows too (data minimisation). **Legal check before hosted launch** ([Licensing](../architecture/12-licensing.md) checklist) |
| Retention | audit + security events 400 d · attempts 180 d · webhooks 30 d · notifications 90 d · soft-deleted posts 30 d · idempotency 24 h / 7 d MCP |
| Backups | self-host: daily encrypted dump + media, 7 daily + 4 weekly, RPO 24 h. Hosted: PITR 7 d + daily dumps 30 d off-region. Every restore goes through quarantine ([ADR-0020](0020-restore-quarantine-and-instance-fencing.md)) |
| Media GC | originals 30 d after the last reference; renditions 7 d after last use; orphans 7 d |
| Lease timings | publish lease 120 s, heartbeat 30 s, reaper grace 30 s; refresh lease 60 s |
| Async give-up | manifest values. IG/Threads image containers start at Meta's guidance (1/min, ≤ 5 min); Reels/video measured in Phase 0 |
| SLOs | ≥ 99.5% of auto destinations published ≤ 60 s after `scheduled_at` (excluding provider 5xx); **0 duplicates** (any = P1); unconfirmed < 0.5% |

## Two-way doors

These can be changed later without a costly migration, so they are deliberately not recorded as ADRs:

- **Providers:** the order within a phase; whether Telegram or Discord lands in Phase 1 or 2.
- **Composer and calendar:** layout and preview visuals.
- **Copy and translations.**
- **Queue-slot UX**, plus the UI and timing of brands, groups and locations.
- **Ops screens:** status-page contents and notification channels.
- **Analytics:** chart types and how often data is refreshed.
- **AI:** vendor and model.
- **Review page:** its design.
- **Business:** pricing numbers and tiers, the marketing message, the interview script.
- **Tuning values:** timings in the table above.
