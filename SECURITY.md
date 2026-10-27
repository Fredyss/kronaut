# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. Don't open a public issue, pull request or discussion for a security problem.

Include what you can:

- the affected component (server, web app, a provider, the Docker image, the CLI) and the commit or image tag;
- steps to reproduce, or a proof of concept;
- the impact as you see it.

You'll get an acknowledgement within 7 days. Fixes are made in private and released before details are published. Reporters are credited in the advisory unless they ask not to be.

## Supported versions

Kronaut is pre-release. Only the latest commit on the default branch is supported; there are no maintained release branches yet.

## Scope

In scope: this repository's code, its Docker image and the self-hosting setup in `infra/`.

Out of scope:

- vulnerabilities in third-party platforms (report those to the platform);
- findings that need an already compromised host, database or operator account;
- missing hardening on a deployment that ignores the [self-hosting guide](docs/guides/self-hosting.md);
- denial of service through volume alone.

Please don't test against instances you don't own or don't have permission to test.
