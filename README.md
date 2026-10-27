# Kronaut

Self-hostable social media scheduler. Plan, approve and publish posts to many networks from one calendar. Agents can draft and schedule through MCP, but they never publish without approval.

> **Status:** pre-alpha, not ready for production use. Working toward the first MVP: scheduling and publishing to Bluesky, Instagram and Mastodon work end to end; Threads can be connected.

## Design goals

- **One process, one database.** Node 24 + Postgres 17. Four containers, under 250 MB idle.
- **Zero duplicate posts.** A public send that times out is verified, never blindly retried.
- **Secure by construction.** Row-level tenancy, envelope-encrypted provider tokens, a single egress path with SSRF protection.
- **Honest previews.** The composer and the publisher share one provider manifest.
- **English, Slovak and Czech** from the first release.

## Development

Requires Node 24 and pnpm (version pinned in `package.json`).

```bash
pnpm install
pnpm check
```

## Documentation

- [Self-hosting guide](docs/guides/self-hosting.md)
- [Architecture](docs/architecture/README.md)
- [Architecture decision records](docs/adr/README.md)
- [Reference](docs/reference/)
- [v1 database schema](packages/db/schema/v1.sql)

## License

[FSL-1.1-ALv2](LICENSE.md). Free to self-host, read and modify. Each release becomes Apache-2.0 two years after publication. See [NOTICE](NOTICE).

[Contributing](CONTRIBUTING.md) · [Security policy](SECURITY.md)
