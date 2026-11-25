# ADR-0067: A workspace may bring its own provider app

- **Status:** Accepted
- **Date:** 2026-11-25
- **Deciders:** Frederik Schlentc
- **Area:** Providers, security, data model
- **Spec:** [Data model](../architecture/04-data-model.md), [Provider contract](../architecture/03-provider-contract.md), [Operations](../architecture/11-operations.md)
- **Supersedes in part:** [ADR-0044](0044-least-privilege-global-tables-and-cross-tenant-entry-points.md) (`provider_apps` grants), [ADR-0049](0049-oauth-channel-connect-flow.md) and [ADR-0053](0053-multi-account-channel-connect.md) (app selection), [ADR-0051](0051-per-instance-oauth-apps.md) ("one app per workspace" rejected)

## Context

X charges the owner of the developer app for every post and every read (pay-per-use, see provider-facts). Kronaut has one instance-wide app per provider, so whoever runs the instance pays for every workspace's X usage. A hosted instance can't pass that cost on.

Each connected account already stores its `provider_app_id`. Publish, refresh, revoke, verify and analytics all load the app through it. Only registration and the choice at connect start assume one instance app.

## Decision

**A workspace owner or admin may register the workspace's own app for a provider whose manifest sets `workspaceApps: true`. Connect start uses it before the instance app. X is the first such provider.**

- **Storage:** `provider_apps.workspace_id uuid NULL REFERENCES workspaces ON DELETE CASCADE`. NULL is an instance app, as before. A CHECK keeps `instance_host = ''` on workspace rows. Uniqueness is `UNIQUE (provider, instance_host, client_id)` across all rows, so one client id belongs to one owner. A partial unique index allows one active app per `(workspace_id, provider)`.
- **Grants (amends ADR-0044):** `kronaut_app` may INSERT and UPDATE a row only where `workspace_id = current tenant`, and may never set or change `workspace_id`. The instance-row rules stay: no INSERT with `workspace_id IS NULL AND instance_host = ''`, and UPDATE of instance rows is limited to status and `last_verified_at`. SELECT shows instance rows and the current tenant's rows only.
- **Secrets:** sealed like instance apps, with the workspace id in the AAD instead of `NIL_WORKSPACE_ID`. A row moved to another workspace can't be opened.
- **Connect start:** the workspace's active app for the provider is used first, then the single active instance app; with neither, the connect fails with `app_config`. The redirect URI stays `/v1/oauth/<provider>/callback`, and each workspace registers it in its own app.
- **Management:** API routes to list, register, replace the secret and disable a workspace app, under a new action `provider_apps:manage`. Only owner and admin hold it. API keys, MCP tools and agents never do, because registering an app changes who pays and where tokens go. Responses never return the secret.
- **Deletion:** a workspace app that accounts still reference can't be deleted (the FK stays), only disabled. Disabling stops new connects and refreshes for its accounts, which then need reconnecting with another app.
- **Failures:** `app_config` on a workspace app marks that row `misconfigured` and shows it in the workspace's settings, not on the instance admin page. The instance incident flow is unchanged for instance apps.
- **Audit:** register, replace and disable are audit events with the actor and the client id, never the secret.

## Options considered

- **Chosen:** the decision above.
- Rejected: workspace apps only, with no instance fallback. Self-hosters with one workspace would have to re-register their app. An operator who wants workspace-only X just registers no instance X app.
- Rejected: an instance setting that forbids the fallback. It isn't needed for that, for the reason above.
- Rejected: all providers at once. Meta, Pinterest, YouTube and the other app reviews are tied to one app per operator. Each provider opts in by its manifest once that is checked.
- Rejected: letting API keys register apps. It would let an automation redirect tokens to an app it controls.

## Consequences

- A hosted instance can offer X without paying for other workspaces' usage.
- `provider_apps` holds tenant data, so every query on it needs a tenant filter or the instance-row filter. Tests cover cross-workspace reads and writes.
- The CLI keeps managing instance apps. Workspace apps are managed only through the API and web.
- Revisit when: another provider allows per-customer apps under its terms, or X changes its pricing model.
