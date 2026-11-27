# ADR-0072: MCP transport, authentication and tool contract

- **Status:** Proposed
- **Date:** 2026-11-27
- **Deciders:** Frederik Schlentc
- **Area:** Identity, agents & security
- **Spec:** [Security](../architecture/06-security.md), [Operations](../architecture/11-operations.md), [Stack](../architecture/01-stack.md)
- **Extends:** [ADR-0030](0030-frozen-mcp-tool-set.md) (tool names), [ADR-0070](0070-api-key-management-and-rate-limits.md) (API keys and rate limits)

## Context

ADR-0030 freezes the 13 MCP tool names, but not how a client reaches them. The architecture review ([AR-11](../reviews/2026-10-21-architecture-hardening.md#ar-11--mcp-transport-and-authentication-are-unspecified)) asks for a transport ADR before Phase 2. It must cover authentication, the Host and Origin policy, generation from the route registry, the action and scope of each tool, idempotency, pagination, size and time limits, cancellation, audit fields and the untrusted-text envelope. The stack chapter already says the tools come from the route registry and share REST's auth and scopes. OAuth with dynamic client registration is Phase 3.

## Decision

**Transport:** Streamable HTTP from `@modelcontextprotocol/sdk` (`WebStandardStreamableHTTPServerTransport`), stateless and with JSON answers only.
- No `Mcp-Session-Id`, no SSE stream, no stdio. Each POST gets a fresh server and transport, so any replica can answer any request and nothing is kept between requests.
- One route, `POST /v1/workspaces/:workspaceId/mcp` (`mcp.endpoint`), defined with `defineRoute` like every route. `GET` and `DELETE` get 405 from the router. A notification-only POST gets 202 with no body.
- The route itself is not idempotent; the tools are (below).

**Authentication (Phase 2):** API keys only, `auth: 'grant'`.
- The same `Authorization: Bearer kro_…` as REST, resolved by the same lookup. A session cookie is not a credential here: 401.
- The workspace is in the path because the registry requires `:workspaceId` on every grant route with an action, and because `bind()` then refuses a key from another workspace with 404 before anything runs.
- The entry action is `posts:read`: every route has exactly one action, and a key without it can't connect. A restricted key with an empty scope is refused (`out_of_scope`). Every tool except the three channel, brand and group lists is about posts, so this costs nothing in practice.

**Host and Origin:** the route is bound with `sameHost`. Right after the router matches it, before the body is read, the key looked up or a rate-limit token taken:
- the request URL's host, and the `Host` header when there is one, must equal the host of `KRONAUT_PUBLIC_URL`, else 403;
- an `Origin` header, when present, must equal that origin exactly (`null` included), else 403.
- This stops DNS rebinding and cross-site browser requests. A proxy in front of the app must pass the public `Host` on.

**Tools come from the route registry:**
- `api-routes.ts` hands the registered routes to the MCP feature. Each tool names one route by id, and the server doesn't start if that route is missing, has a query schema, or has an action an API key can't hold.
- A tool's input schema is the route's path params (without `workspaceId`) plus `body`, the route's Zod body, plus `idempotencyKey` where it applies, rendered with `z.toJSONSchema` (input side). Arguments are passed to the route unparsed, so the route's validation and its error codes apply. Only the envelope (strings for params, unknown keys refused) is checked first.
- A tool's scope is its route's action. `tools/list` shows only the tools whose scope the key holds; calling any other name is JSON-RPC `-32602 Unknown tool.`, the same for a hidden tool and a nonexistent one.
- A tool runs its route in-process through the whole HTTP pipeline (`ctx.dispatch`): authentication with the caller's `Authorization` (and `Cf-Access-Jwt-Assertion`), the key's rate-limit bucket, `authorize()` (scopes ∩ sponsor role ∩ resource access, approvals), idempotency and the response check. Never over the network, and never a handler or the database called directly.

| Tool | Route | Action = scope | Idempotency key |
|---|---|---|---|
| `get_brand_context` | `brands.list` | `brands:read` | none |
| `list_channels` | `channels.list` | `channels:read` | none |
| `list_account_groups` | `groups.list` | `groups:read` | none |
| `draft_campaign` ★ | `posts.create` | `posts:draft` | required |
| `update_draft` ★ | `posts.update` | `posts:draft` | required |
| `add_media_from_url` ★ | `media.import_create`, then `media.import_get` | `media:write` | required |
| `validate_draft` | `posts.preflight` | `posts:read` | none |
| `preview_post` | `posts.preflight` | `posts:read` | none |
| `request_approval` ★ | `posts.request_approval` | `posts:submit` | required |
| `schedule_approved_post` ★ | `posts.schedule` | `posts:schedule` | required |
| `get_publish_status` | `posts.get` | `posts:read` | none |
| `cancel_scheduled_post` | `posts.cancel` | `posts:cancel` | optional, generated |
| `get_post_metrics` | `analytics.post_metrics` | `analytics:read` | none |

- `posts.preflight` (`GET …/posts/:postId/preflight`, `posts:read`) is the one route added for MCP: it runs the preflight that freezing runs, on the draft destinations, and writes nothing. `validate_draft` returns its issues, `preview_post` its rendered text.
- `schedule_approved_post` is the schedule route unchanged: an API key never schedules without a human approval (`authorize()`, `trg_dest_guard`), so an unapproved post fails with `approval_required`. Approve, publish now, unpublish, connect, settings and grants stay out.

**Idempotency:**
- The ★ tools take `idempotencyKey` (8–128 of `A-Za-z0-9_-`), sent as the route's `Idempotency-Key`. Without it the route answers `idempotency_key_required`.
- `cancel_scheduled_post` isn't ★ (ADR-0030), but its route requires a key, so the tool takes one optionally and makes up a random one without it.
- MCP keys are stored for 7 days, REST keys for 24 h. The slot is the route's: workspace, the key's grant, the key. Reusing a key for a different request is `idempotency_key_reused`, also across REST and MCP.
- `add_media_from_url` creates the import (or replays it) and then reads it fresh, so calling it again with the same key reports progress.

**Pagination:** no route behind a tool pages today; the three lists return the whole workspace. When one gains `cursor` and `limit` query params, its tool takes them as a `query` argument and passes them through unchanged, and the answer's `nextCursor` comes back as is. Until then the registry check above refuses any tool route with a query schema, so the change can't slip in unnoticed.

**Size limits:**
- A request holds one JSON-RPC message or a batch of at most 20.
- The request body is capped at the server's default 1 MiB, and each route a tool runs keeps its own body limit.
- Each tool result is capped at 512 KiB of JSON. A larger result is replaced by a tool error `payload_too_large`; nothing is truncated, so no partial text reaches the agent.

**Time limits and cancellation:**
- Each tool call gets 30 s. Past that the call answers the tool error `unavailable` ("it may still finish; retry with the same idempotencyKey").
- The route behind the call isn't cancelled. It keeps running to completion and only its answer is dropped, because the pipeline has no cancellation point between its transactions, and stopping a write halfway is worse than finishing it. A ★ tool retried with the same key waits for the first call's transaction and then gets its stored result.
- MCP `notifications/cancelled` and a client disconnect are ignored for the same reason. In stateless mode a cancel arrives as its own POST to a server that has nothing in flight.

**Audit:**
- Every tool call writes one log line, `mcp tool call`, with the tool name, the grant id, the outcome, the error code and the duration, plus the request id that every log line has. No arguments, no text and no result.
- A route that writes `audit_events` while run by a tool records `surface = 'mcp'` and `tool = '<tool name>'` instead of `surface = 'api'` (`auditActor`), with the grant as actor as before. Reads write no audit event.

**Errors:** a route's problem details come back unchanged as a tool result with `isError: true` and the same `{error: {code, message, details, requestId}}`. Invalid arguments are `invalid_request` with `arguments.<path>` details. A failure inside the MCP layer is logged and answered with a generic `internal`, never a stack trace or a secret.

**Untrusted text:** text not written by a workspace member comes back as `{untrusted: true, source, text}`.
- `source: 'provider'`: channel display names and the labels of channel setting options (boards, server channels), which come from the social network.
- `source: 'post'`: post titles and the text in `preview_post`. A post can hold text from an RSS feed or an import, and the server doesn't track who wrote each part, so all post text is wrapped.
- Tools that return a post (`draft_campaign`, `update_draft`, `request_approval`, `schedule_approved_post`, `cancel_scheduled_post`, `get_publish_status`) return its status: ids, version, the wrapped title, schedule and per-destination state, error codes and remote URL, without the post's text. `get_post_metrics` returns numbers only, `add_media_from_url` the import's state and the asset's id, kind, state and type.
- Provider error text is never returned; destinations carry codes only.

## Options considered

- **Chosen:** the decision above.
- Rejected: the high-level `McpServer` with `registerTool`. It parses arguments with the Zod schema and hands the parsed values on, so a route's transforms would run twice and its error codes would turn into JSON-RPC `-32602`. The low-level `Server` takes raw arguments; the SDK marks it deprecated for anything but advanced use, which this is.
- Rejected: SSE streaming and sessions. They need sticky routing or a shared session store, and no tool streams progress.
- Rejected: `/v1/mcp` without the workspace. The registry rule and `bind()` would need an exception for one route, and a key from another workspace would reach the handler.
- Rejected: handlers or services called directly from the MCP layer. Each tool would re-implement authorization, rate limits and idempotency, and could drift from REST.
- Rejected: looping back over HTTP to the server's own URL. It crosses the proxy and the Access gate a second time and needs the public URL to be reachable from inside.
- Rejected: truncating large results. A cut list or text looks complete to an agent.
- Rejected: aborting the route on timeout. Its writes span several transactions; a half-done schedule or import is worse than a late one.
- Rejected: OAuth with dynamic client registration now. It's Phase 3 (grant kind `oauth`); until then a person creates a key and pastes it into the client.

## Consequences

- Agents get REST's rules with no second implementation: a new rule on a route applies to its tool at once, and a tool can't reach a route an API key can't.
- Each MCP request takes one token from the key's rate limit, and each route a tool runs takes one more, so a single tool call costs at least two.
- A route behind a tool that changes its body changes the tool's input schema with it. The tool names stay frozen (ADR-0030); the matrix test catches a changed route, action or key rule.
- A proxy that rewrites `Host` breaks MCP with 403 until it passes the public host on.
- The SDK's low-level `Server` may go away in a later major version. The use is small (two request handlers), and the SDK is pinned in the catalog.
- Revisit when: Phase 3 adds OAuth/DCR (a second auth mode on the route, and the entry action), a tool needs streaming or progress, a route behind a tool gains pagination, or the SDK drops `Server`.
