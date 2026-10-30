# Kronaut architecture

Kronaut is a self-hostable social media scheduler: plan, approve and publish posts to many networks from one calendar, with agents as first-class but approval-gated authors.

**Shape: TypeScript end-to-end on Node 24, one process with roles, Postgres as the only stateful service.**

| Target | Budget |
|---|---|
| Containers | 4 (app, media, postgres, cloudflared) |
| Idle RAM | < 250 MB total |
| Cold start | < 5 s |
| Prod transitive deps | < 200 (CI-gated) |
| Env vars | < 25, validated at boot |
| Initial JS (gz) | ≤ 150 KB (CI-gated) |

Go was seriously considered. It saves ~50–70 MB RSS, less than Postgres itself uses, at the cost of two languages and losing the **shared provider manifest** that keeps previews identical to what actually gets published (the #1 product risk). Bun was rejected: the SSRF egress design needs undici's `Agent{connect.lookup}` dispatcher.

## Sources of truth

1. [ADRs](../adr/README.md): one-way decisions. They win on conflict.
2. [`packages/db/schema/v1.sql`](../../packages/db/schema/v1.sql): the normative v1 schema.
3. This spec, one chapter per concern.
4. [Reference](../reference/): provider facts and the test catalogues.

## Chapters

1. [Stack](01-stack.md)
2. [Repo layout](02-repo-layout.md)
3. [Provider contract](03-provider-contract.md)
4. [Data model](04-data-model.md)
5. [Publishing pipeline](05-publishing-pipeline.md)
6. [Security](06-security.md)
7. [Media](07-media.md)
8. [Frontend](08-frontend.md)
9. [Roadmap](09-roadmap.md)
10. [Scope and risks](10-scope-and-risks.md)
11. [Operations](11-operations.md)
12. [Licensing](12-licensing.md)
13. [Code structure](13-code-structure.md)

## Reference

- [Provider facts](../reference/provider-facts.md)
- [Security acceptance tests](../reference/security-tests.md)
- [Reliability test matrix](../reference/reliability-tests.md)

> **Clean-room rule.** Kronaut is built only from these documents and official platform API documentation. Never read, copy or adapt source code, translations or assets from any third-party social media scheduler. All UI strings, including Slovak and Czech, are written fresh.
