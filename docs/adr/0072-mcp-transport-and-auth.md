# ADR-0072: MCP transport, authentication and tool contract

- **Status:** Accepted
- **Date:** 2026-11-28
- **Deciders:** Frederik Schlentc
- **Area:** Identity, agents & security
- **Spec:** [Security](../architecture/06-security.md), [Operations](../architecture/11-operations.md), [Stack](../architecture/01-stack.md)
- **Extends:** [ADR-0030](0030-frozen-mcp-tool-set.md) (tool names), [ADR-0070](0070-api-key-management-and-rate-limits.md) (API keys and rate limits)

## Context

ADR-0030 freezes the 13 MCP tool names, but not how a client reaches them. The architecture review ([AR-11](../reviews/2026-10-21-architecture-hardening.md#ar-11--mcp-transport-and-authentication-are-unspecified)) asks for a transport ADR before Phase 2. It must cover authentication, the Host and Origin policy, generation from the route registry, the action and scope of each tool, idempotency, pagination, size and time limits, cancellation, audit fields and the untrusted-text envelope. The stack chapter already says the tools come from the route registry and share REST's auth and scopes. OAuth with dynamic client registration is Phase 3.

## Decision

**Role:** REST stays the primary contract for agents and programs. MCP is an optional adapter over it: a tool only runs existing REST routes under the same key (one route, or a fixed few for `get_brand_context` and `add_media_from_url`), so anything a tool can do, the same key can do over REST.

**Transport:** Streamable HTTP from `@modelcontextprotocol/sdk` (`WebStandardStreamableHTTPServerTransport`), stateless and with JSON answers only.
- No `Mcp-Session-Id`, no SSE stream, no stdio. Each POST gets a fresh server and transport, so any replica can answer any request and nothing is kept between requests.
- One route, `POST /v1/workspaces/:workspaceId/mcp` (`mcp.endpoint`), defined with `defineRoute` like every route. `GET` and `DELETE` get 405 from the router. A notification-only POST gets 202 with no body.
- A request carries exactly one JSON-RPC message. Batches were removed from the protocol in 2025-06-18; a JSON array body fails the route's body schema with 400.
- Protocol versions are the SDK's `SUPPORTED_PROTOCOL_VERSIONS`. With SDK 1.32.2 these are `2025-11-25`, `2025-06-18`, `2025-03-26`, `2024-11-05` and `2024-10-07`; the transport refuses any other `MCP-Protocol-Version` with 400. Every SDK upgrade must review this list, because a new version can change the wire contract under the same route.
- The route itself is not idempotent; the tools are (below).

**Authentication (Phase 2):** API keys only, `auth: 'grant'`.
- The same `Authorization: Bearer kro_…` as REST, resolved by the same lookup. A session cookie is not a credential here: 401.
- Every 401 from this route carries `WWW-Authenticate: Bearer realm="kronaut"`, with no `resource_metadata`: there is no OAuth authorization server to point to yet. `/.well-known/oauth-protected-resource` and its per-path form (`/.well-known/oauth-protected-resource/v1/workspaces/…/mcp`) answer 404: `/.well-known/` is reserved, so the web app doesn't serve it, and no route is registered there.
- Client setup: the URL `https://<host of KRONAUT_PUBLIC_URL>/v1/workspaces/<workspace id>/mcp` (the `ws_…` id from the API) and the header `Authorization: Bearer kro_…`, with a key that has `posts:read` plus the scopes of the tools it should see.
- The workspace is in the path because the registry requires `:workspaceId` on every grant route with an action, and because `bind()` then refuses a key from another workspace with 404 before anything runs.
- The entry action is `posts:read`: every route has exactly one action, and a key without it can't connect. A restricted key with an empty scope is refused (`out_of_scope`). Every tool except the three channel, brand and group lists is about posts, so this costs nothing in practice.

**Host and Origin:** the route is bound with `sameHost`. Right after the router matches it, before the body is read, the key looked up or a rate-limit token taken:
- the request URL's host, and the `Host` header when there is one, must equal the host of `KRONAUT_PUBLIC_URL`, else 403;
- an `Origin` header, when present, must equal that origin exactly (`null` included), else 403.
- This stops DNS rebinding and cross-site browser requests. A proxy in front of the app must pass the public `Host` on.
- There is one host. MCP is reachable only on the host of `KRONAUT_PUBLIC_URL`; the same server reached by a LAN address, a Tailscale name or `localhost` answers 403. A client on the LAN uses the public URL too.

**Access gate:** when Cloudflare Access protects the instance, its check runs before the router, so an MCP client must pass it too. Either the client sends a Cloudflare service token (the `CF-Access-Client-Id` and `CF-Access-Client-Secret` headers, with a Service Auth policy on the application), or the Access application gets a bypass rule for `/v1/workspaces/*/mcp`, and the API key alone protects that path. Kronaut needs no code for either.

**Tools come from the route registry:**
- `api-routes.ts` hands the registered routes to the MCP feature. Each tool names one route by id, and the server doesn't start if that route is missing, has a query schema, or has an action an API key can't hold.
- A tool's input schema is the route's path params (without `workspaceId`) plus `body`, the route's Zod body, plus `idempotencyKey` where it applies, rendered with `z.toJSONSchema` (input side). Arguments are passed to the route unparsed, so the route's validation and its error codes apply. Only the envelope (strings for params, unknown keys refused) is checked first.
- A tool's scope is its route's action. `tools/list` shows a tool when `authorize()` lets the key take that action in the workspace, through the same entry check routes use (`deniedAtEntry`): the key's scopes ∩ its sponsor's current role, read again on every request. Resource access and approvals aren't known at that point and stay per call, so a restricted key sees the tools its scopes and role allow. Calling any other name is JSON-RPC `-32602 Unknown tool.`, the same for a hidden tool and a nonexistent one.
- A tool runs its route in-process through the whole HTTP pipeline (`ctx.dispatch`): authentication with the caller's `Authorization` (and `Cf-Access-Jwt-Assertion`), the key's rate-limit bucket, `authorize()` (scopes ∩ sponsor role ∩ resource access, approvals), idempotency and the response check. Never over the network, and never a handler or the database called directly.

| Tool | Route | Action = scope | Idempotency key |
|---|---|---|---|
| `get_brand_context` | `brands.list`, then `channels.list` and `saved_texts.list` | `brands:read` | none |
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
- `get_brand_context` lists each brand with its id, name and `archived` (true when it is archived), its channels (id, provider, display name) and its signatures (id, plain text, and the brand's channels it is added to). `unbranded` holds the same for channels without a brand. `templates` lists every saved text added to no channel once (id, plain text), also when the workspace has no brands.
  - A saved text added to channels is a signature in each group that has one of them. A signature on channels the key can't see is left out.
  - The tool runs `brands.list`, then `channels.list` and `saved_texts.list`, each as its own route with its own action (`channels:read`, `posts:read`). A part the key may not read (`scope_missing` or `not_permitted`) is left out and named in `omitted` (`channels`, `savedTexts`; empty when nothing is left out). Without channels no signature can be matched, so the groups have no channels or signatures and only `templates` is listed.
  - The tool's own scope stays `brands:read`. The lists are whole, as nothing pages (below).
- `draft_campaign` creates a campaign, which here means one post with its destinations across channels: one draft post with a destination on each channel it goes to. It isn't the `campaigns` table, which groups posts and has no MCP tool.
- `schedule_approved_post` is the schedule route unchanged: an API key never schedules without a human approval (`authorize()`, `trg_dest_guard`), so an unapproved post fails with `approval_required`. Approve, publish now, unpublish, connect, settings and grants stay out.

**Idempotency:**
- The ★ tools take `idempotencyKey` (8–128 of `A-Za-z0-9_-`), sent as the route's `Idempotency-Key`. Without it the route answers `idempotency_key_required`.
- `cancel_scheduled_post` isn't ★ (ADR-0030), but its route requires a key, so the tool takes one optionally and makes up a random one without it.
- MCP keys are stored for 7 days, REST keys for 24 h. The daily `idempotency_retention` cron task deletes expired rows in every workspace, 10 000 at a time, through `sweep_workspaces` and the tenant role. An expired key that is used again was already cleared on that use. The slot is the route's: workspace, the key's grant, the key. Reusing a key for a different request is `idempotency_key_reused`, also across REST and MCP.
- `add_media_from_url` creates the import (or replays it) and then reads it fresh, so calling it again with the same key reports progress.

**Pagination:** no route behind a tool pages today; the three lists return the whole workspace. When one gains `cursor` and `limit` query params, its tool takes them as a `query` argument and passes them through unchanged, and the answer's `nextCursor` comes back as is. Until then the registry check above refuses any tool route with a query schema, so the change can't slip in unnoticed.

**Typed results:**
- Every tool declares an `outputSchema`, rendered with `z.toJSONSchema` (output side) from one Zod schema per result in `actors/mcp/results.ts`. The same schema builds the result: the presenter's output is parsed with it, so fields the schema doesn't name are dropped and a result can't drift from what `tools/list` says.
- `list_channels`, `list_account_groups` and `get_post_metrics` take theirs from the route's response schema, with channel names and option labels wrapped as untrusted; the others have their own.
- Annotations: `readOnlyHint` on the 7 read tools. The 6 writes get `readOnlyHint: false`, `destructiveHint` only on `cancel_scheduled_post`, and `idempotentHint` on the ★ tools.
- A snapshot test (`tools-list.test.ts`) holds the whole `tools/list` output: names, descriptions, input and output schemas and annotations. Any change to the contract shows up in review.

**Size limits:**
- A request holds exactly one JSON-RPC message (above).
- The request body is capped at the server's default 1 MiB, and each route a tool runs keeps its own body limit.
- Each tool result is capped at 512 KiB of JSON. A larger result is replaced by a tool error `payload_too_large`; nothing is truncated, so no partial text reaches the agent.

**Time limits and cancellation:**
- Each tool call gets 30 s. Past that the call answers the tool error `unavailable` ("it may still finish; retry with the same idempotencyKey").
- The whole request must answer within 35 s, else it gets HTTP 503 `unavailable`. With one message per request the tool deadline normally answers first; the request deadline bounds everything around it.
- The route behind the call isn't cancelled. It keeps running to completion and only its answer is dropped, because the pipeline has no cancellation point between its transactions, and stopping a write halfway is worse than finishing it. A ★ tool retried with the same key waits for the first call's transaction and then gets its stored result.
- MCP `notifications/cancelled` and a client disconnect are ignored for the same reason. In stateless mode a cancel arrives as its own POST to a server that has nothing in flight.

**Audit:**
- Every tool call writes one log line, `mcp tool call`, with the tool name, the grant id, the outcome, the error code and the duration, plus the request id that every log line has. No arguments, no text and no result.
- A route that writes `audit_events` while run by a tool records `surface = 'mcp'` and `tool = '<tool name>'` instead of `surface = 'api'` (`auditActor`), with the grant as actor as before. Reads write no audit event.

**Errors:**
- A route's problem details come back unchanged as a tool result with `isError: true` and the same `{error: {code, message, details, requestId}}`, as JSON text only. An error result has no `structuredContent`, because clients check that against the success `outputSchema`.
- Invalid arguments are `invalid_request` with `arguments.<path>` details.
- A route that hits the key's rate limit becomes the tool error `rate_limited` with `details: {retryAfterSeconds}`, taken from the route's `Retry-After`. An MCP request that is itself over the limit gets HTTP 429 with `Retry-After`, like any route.
- A failure inside the MCP layer is logged and answered with a generic `internal`, never a stack trace or a secret.

**Untrusted text:** text not written by a workspace member comes back as `{untrusted: true, source, text}`.
- `source: 'provider'`: channel display names and the labels of channel setting options (boards, server channels), which come from the social network.
- `source: 'post'`: post titles and the text in `preview_post`. A post can hold text from an RSS feed or an import, and the server doesn't track who wrote each part, so all post text is wrapped.
- Tools that return a post (`draft_campaign`, `update_draft`, `request_approval`, `schedule_approved_post`, `cancel_scheduled_post`, `get_publish_status`) return its status: ids, version, the wrapped title, schedule and per-destination state, error codes and remote URL, without the post's text. `get_post_metrics` returns numbers only, `add_media_from_url` the import's state and the asset's id, kind, state and type.
- `get_brand_context` wraps channel display names as `provider` and saved texts as `post`: members write saved texts, but they go into posts and can hold pasted text.
- Provider error text is never returned; destinations carry codes only.

## Options considered

- **Chosen:** the decision above.
- Rejected: REST only, with agents importing the OpenAPI document. Each user would write their own wrapper, agents would choose among every route instead of 13 task tools, and third-party text would reach the model without the untrusted envelope.
- Rejected: the high-level `McpServer` with `registerTool`. It parses arguments with the Zod schema and hands the parsed values on, so a route's transforms would run twice and its error codes would turn into JSON-RPC `-32602`. The low-level `Server` takes raw arguments; the SDK marks it deprecated for anything but advanced use, which this is.
- Rejected: SSE streaming and sessions. They need sticky routing or a shared session store, and no tool streams progress.
- Rejected: `/v1/mcp` without the workspace. The registry rule and `bind()` would need an exception for one route, and a key from another workspace would reach the handler.
- Rejected: handlers or services called directly from the MCP layer. Each tool would re-implement authorization, rate limits and idempotency, and could drift from REST.
- Rejected: looping back over HTTP to the server's own URL. It crosses the proxy and the Access gate a second time and needs the public URL to be reachable from inside.
- Rejected: truncating large results. A cut list or text looks complete to an agent.
- Rejected: aborting the route on timeout. Its writes span several transactions; a half-done schedule or import is worse than a late one.
- Rejected: JSON-RPC batches. The 2025-06-18 protocol dropped them, and one message per request keeps one deadline, one output cap and one log line per call.
- Rejected: a `resource_metadata` link and an OAuth protected-resource document now. Without an authorization server they would only send clients looking for one.
- Rejected: listing every tool and failing at call time. A client would offer an agent tools that can only fail.
- Rejected: a second host (LAN, Tailscale or `localhost`) for MCP. Each extra host widens the rebinding check, and the public URL works from the LAN.
- Rejected: `get_brand_context` failing when the key lacks `channels:read` or `posts:read`. A brands-only key still gets brand ids and names, and `omitted` says what's missing.
- Rejected: OAuth with dynamic client registration now. It's Phase 3 (grant kind `oauth`); until then a person creates a key and pastes it into the client.

## Consequences

- Agents get REST's rules with no second implementation: a new rule on a route applies to its tool at once, and a tool can't reach a route an API key can't.
- Each MCP request takes one token from the key's rate limit, and each route a tool runs takes one more, so a single tool call costs at least two.
- A route behind a tool that changes its body changes the tool's input schema with it. The tool names stay frozen (ADR-0030); the matrix test catches a changed route, action or key rule.
- A proxy that rewrites `Host` breaks MCP with 403 until it passes the public host on.
- `get_brand_context` costs up to four rate-limit tokens: the request and its three routes. Templates are listed once, so the cap is reached only by a very large workspace.
- A change to a route's response schema can change the `outputSchema` of the tool built from it; the snapshot test fails until the snapshot is updated in the same change.
- The SDK's low-level `Server` may go away in a later major version. The use is small (two request handlers), and the SDK is pinned in the catalog.
- Revisit when: Phase 3 adds OAuth/DCR (a second auth mode on the route, the entry action, `resource_metadata` and the protected-resource document), a tool needs streaming or progress, a route behind a tool gains pagination, the SDK drops `Server`, or an SDK upgrade changes `SUPPORTED_PROTOCOL_VERSIONS`.
