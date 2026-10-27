# License

**Decision: public under FSL-1.1-ALv2 since 2026-10-27, after the Phase 1 MVP** (Functional Source License). Each version's two-year Apache-2.0 clock starts when it's published. Files: `LICENSE.md` (verbatim official template from fsl.software), `NOTICE`.

| Option | Verdict |
|---|---|
| **FSL-1.1-ALv2** | ✅ Free to self-host, read and modify, and to use internally. Prohibits a competing product or hosted service for 2 years. Each version becomes Apache-2.0 after 2 years. Standard text. |
| AGPL-3.0 | ❌ Doesn't stop commercial clones: hosting is allowed if changes are published. |
| MIT / Apache-2.0 | ❌ Anyone can take it and close it. |
| BSL 1.1 | ⚠️ Same idea as FSL, but every parameter is custom, so more to get wrong. |
| Elastic License 2.0 | ⚠️ Never converts to open source, so it draws more distrust. |
| Closed forever | ⚠️ Strongest protection, but you lose self-hosters (the main growth channel). |

Rules:
- **Copyright holder:** a person now. If a company is founded for the SaaS, the person transfers the copyright to it in writing.
- **CLA from the first external PR** (CLA Assistant): contributors grant the licensor the right to relicense. Without a CLA, each contributor keeps the rights to their part, and dual-licensing or changing the license becomes impossible.
- **Dependency license gate (`pnpm licenses:check`, part of `check`):** covers production dependencies only. Allow MIT, MIT-0, Apache-2.0, BSD-2/3, ISC, 0BSD, BlueOak, CC0, MPL-2.0 (file-level), Python-2.0 and Unlicense. Block GPL/AGPL/LGPL in bundled JS, SSPL, BUSL, and unknown licenses. Exceptions are listed by package with a reason in `tools/licenses/policy.ts`. `THIRD_PARTY_NOTICES` is generated in the Docker build (server and web dependencies) and never committed.
- **ffmpeg** runs as a separate subprocess with a stock binary and is never linked. sharp's prebuilt libvips (LGPL) is dynamically linked and allowed by an explicit exception.
- **Legal review** of the FSL + SaaS terms before Phase 3 launch.

## Licensing formalities

The licensor is currently **Frederik Schlentc (personal)**. Before the repo goes public:
- [ ] Decide on a company for the SaaS. If one is founded: a written copyright assignment, then update `LICENSE.md` and `NOTICE`.
- [x] Confirm the CI dependency-license gate passes.
- [ ] Set up the CLA bot before accepting the first external PR. Until then, [CONTRIBUTING](../../CONTRIBUTING.md) says external PRs aren't merged.
- [ ] Have a lawyer review the FSL choice and the clean-room statement in `NOTICE`.
- [ ] A legal organisation is needed for LinkedIn Community Management API (Pages) and Meta business verification on the hosted apps. Factor this into the company decision.
- [ ] Get a legal view on audit retention when a workspace is deleted. The current default deletes the workspace's audit rows with it ([ADR defaults](../adr/README.md#defaults)).
- [ ] TikTok audit terms vs self-host: confirm the hosted-only stance (ADR-0043).
- [x] Generate `THIRD_PARTY_NOTICES`.
- [x] Add `SECURITY.md` (private vulnerability reporting) and `CONTRIBUTING.md`.
- [x] Publish as a **fresh public repo** with one squashed commit under the GitHub noreply email, so the private history (and the personal email in old commits) stays private. Rename this repo to `kronaut-private` first.
- [x] On the public repo: secret scanning with push protection, Dependabot alerts, private vulnerability reporting, a ruleset on `main` (PRs only, no force-push or deletion), and approval before fork PRs run workflows.
