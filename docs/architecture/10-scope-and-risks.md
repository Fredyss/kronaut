# Scope and risks

## Non-goals

**Never:**

- a Canva-style design editor
- a cookie-reading browser extension
- web3/Solana billing
- "plugs" auto-engagement
- server AI with side-effecting tools
- auto-retrying an ambiguous public send
- Elasticsearch / Redis / Temporal
- phone-home telemetry or license keys in self-host

**Not in v1 (may come later):**

- social inbox/replies
- AI video generation/clipping (RunPod/HeyGen)
- a built-in campaign compiler
- multi-stage approval chains (the column exists, always 1 stage)
- per-brand roles
- FORCE RLS
- multi-region
- organic LinkedIn carousels (no API)

## Top risks

1. **Provider treadmill.** There are 30+ APIs with churn and app-review gates.
   - Mitigation: 6 providers in v1, a pinned `apiVersion` + sunset date, recorded fixtures, the conformance suite, an `experimental` tier, and facts re-verified before each build.
2. **Infra before value.**
   - Mitigation: the Phase 0 gate is a real published post on Bluesky and IG, not a perfect security layer. The schema is complete, but code is built only for the gate.
3. **Feature parity is limited by platforms, not code.** Measure "providers usable with a fresh dev app" and show the limits honestly (ADR-0043).
   - **YouTube:** `videos.insert` has its own bucket of 100/day **per Cloud project**, shared by the whole install. Whether unverified projects post private-only is unclear in the docs, so detect it at runtime.
   - **TikTok:** the audit rejects "tools for accounts you/your team manage", so it is effectively **hosted-only**.
   - **LinkedIn Pages:** CMA needs a **registered legal organisation**.
   - **Pinterest:** apps registered after 2026-09-14 get `PINNER_DATA_ACCESS_DENIED` for non-business accounts.
   - **X:** paid per post, at $0.015, or $0.20 with a URL. A negative credit balance blocks the app, which is an instance incident.
   - **Google Business Profile:** needs a profile verified for 60+ days.
   - **Meta:** App Review takes weeks.
   - **Google OAuth:** a cap of 100 refresh tokens per account per client, and 6-month idle death.
4. **Self-host needs a public HTTPS hostname** (Bluesky confidential client, IG media, OAuth).
   - Mitigation: cloudflared in compose and a setup check. Revisit an app-password path if self-hosters complain.
5. **AI agents eroding invariants** (stale API knowledge, raw fetch, `selectAll`).
   - Mitigation: lint/GritQL bans, conformance tests, a provider template, dated API-doc snapshots in the repo, and DB-enforced invariants that agents cannot route around.
6. **Trigger-heavy schema.** Behaviour hides in the DB and is hard for implementers to see.
   - Mitigation: every trigger has a named CI test (the 50 smoke checks). Trigger errors use custom SQLSTATEs (`KR001`…) mapped to domain errors. `packages/db/schema/v1.sql` is the single source.
7. **RLS performance is unproven.** It has not been tested with EXPLAIN.
   - Mitigation: a 1M-destination benchmark before the Phase 1 release. If p95 regresses by more than 20%, revisit ADR-0003.
8. **Preview/publish drift.**
   - Mitigation: one `@kronaut/compose` package, golden tests, and server re-validation before approval and at claim.
9. **Clean-room contamination.**
   - Mitigation: implementers work from this spec, the [ADRs](../adr/README.md), `packages/db/schema/v1.sql` and official API docs only. They never read source code from third-party social media schedulers.
