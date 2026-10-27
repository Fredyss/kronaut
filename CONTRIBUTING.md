# Contributing

Thanks for your interest in Kronaut. It's pre-release and moves fast, so please read this before you spend time on a change.

## Issues first

Bug reports and feature ideas are welcome as GitHub issues. Report security problems privately as described in [SECURITY.md](SECURITY.md), never as an issue.

## Pull requests and the CLA

External pull requests **can't be merged yet**. Every contribution will need a signed Contributor License Agreement (CLA), which lets the licensor keep relicensing the project, for example under the Apache-2.0 future license that [FSL-1.1-ALv2](LICENSE.md) grants. A CLA bot will ask you to sign on your pull request once it's set up. Until then, please open an issue to discuss a change instead of sending code.

## Clean-room rule

Kronaut is built only from this repository's documentation and the official platform API documentation. A contribution must not contain source code, translations or other assets copied or adapted from any other social media scheduling product. Slovak and Czech strings are written fresh.

## Working on the code

Requires Node 24, pnpm (the version is pinned in `package.json`) and Docker for the database tests.

```bash
pnpm install
pnpm check      # Biome, duplication, types, unit tests, license gate
pnpm test:db    # schema, trigger and database tests (testcontainers)
```

Start with the [architecture docs](docs/architecture/README.md) and the [decision records](docs/adr/README.md). Accepted ADRs are never edited; a new ADR supersedes an old one.
