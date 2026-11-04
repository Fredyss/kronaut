# Shortener facts

Checked against official documentation on 2026-11-04. Shorteners change: re-verify every fact before building or changing a shortener integration, and update the date here. "Undocumented" means none of the sources listed below say it.

**Dub** (REST API, `https://api.dub.co`)

Checked 2026-11-04 against DU1–DU12.
- **Auth** (DU1, DU2). `Authorization: Bearer <key>`. API keys start with `dub_` (`dub_xxxxxxxx`); length and alphabet are undocumented. Publishable keys (`dub_pk_…`) are for client-side conversion tracking only, never for link creation.
  - Each key is tied to one workspace. Permissions are "All permissions", "Read only" or "Restricted" (Dub Links resources: links, domains, folders, tags). A "Machine" key creates a machine user with owner-role permissions.
  - Errors for an invalid, missing or revoked key are not described beyond the generic `401 unauthorized`; an insufficient-permission error "should tell you which permissions you need".
- **Base URL** (DU1, DU10). Hosted: `https://api.dub.co`; plain HTTP is not supported.
  - Self-hosted: the self-hosting guide documents no API base URL. It deploys `apps/web` to Vercel (app on e.g. `app.acme.com`, short domain e.g. `ac.me`, via `NEXT_PUBLIC_APP_DOMAIN` and `NEXT_PUBLIC_APP_SHORT_DOMAIN`), needs Tinybird, Upstash, PlanetScale-compatible MySQL and Vercel Edge Middleware, and states "Docker is currently not supported". The TypeScript SDK page shows no base-URL option (DU11). Treat a self-hosted Dub API address as undocumented.
- **Create** (DU3). `POST /links`, JSON body; only `url` is required.
  - `url`: destination, ≤32,000 characters. This is the only documented long-URL limit.
  - `domain`: without protocol, ≤190; defaults to the workspace's primary domain, or `dub.sh` if the workspace has none.
  - `key`: the slug, ≤190; omitted → a random 7-character slug. `keyLength` 3–190 (default 7); `prefix` (e.g. `/c/`) is ignored when `key` is set.
  - `externalId`: "your database ID", ≤190, "unique across your workspace". `tenantId` ≤190 groups links by tenant.
  - Also `tagIds`, `tagNames`, `folderId`, `comments`, `expiresAt`, `utm_*` (≤255 each), `ref`, `proxy` and preview fields, `ios`/`android`/`geo`, `trackConversion`, `archived`, `doIndex`, `password`, `testVariants`.
- **Response** (DU3). `200` with the Link object: `id` (Dub's link id), `shortLink` (the full short URL), `domain`, `key`, `url`, `externalId`, `tenantId`, `qrCode`, `clicks`, `createdAt`, `updatedAt`, and more. Create is documented as `200`, not `201`.
- **Idempotency** (DU3, DU4, DU5). No idempotency key is documented.
  - `externalId` is the documented guard: creating a link with an existing `externalId` "will result in a `409` conflict error" (DU5). The 409 body is the generic error envelope; whether it says which field collided (`externalId` or `domain`+`key`) is undocumented.
  - Upsert: `PUT /links/upsert`, same body. It works "by its URL": if a link with the same `url` exists it is returned, or updated "if there are any changes"; otherwise a new link is created (DU4). Matching on `externalId`, `domain` or `tenantId` is not mentioned, so two callers upserting the same long URL get the same link.
- **Lookup** (DU6, DU7, DU8).
  - `GET /links/info` with `domain`+`key`, or `linkId`, or `externalId`. The `externalId` "must be prefixed with `ext_` when passed as a query parameter" (`ext_12345` for `12345`).
  - `PATCH /links/{linkId}` accepts `ext_<externalId>` in place of the link id.
  - By long URL: no exact filter. `GET /links?search=` matches "the short link slug and the destination url" (fuzzy); also `domain`, `tenantId`, `tagIds`, `folderId`; cursor paging with `startingAfter`/`endingBefore`, `pageSize` ≤100 (default 100).
- **Rate limits** (DU9). Per minute: Free 60, Pro 600, Business 1,200, Advanced 3,000, Enterprise custom. `GET /analytics` and `GET /events` per second: Free none, Pro 2, Business 4, Advanced 8.
  - Exceeding returns `429` `rate_limit_exceeded`. Headers: `X-RateLimit-Limit` (documented as "per hour", which contradicts the per-minute table), `X-RateLimit-Remaining`, `X-RateLimit-Reset` (UTC epoch seconds), `Retry-After` (seconds).
  - Whether the limit is per key or per workspace is undocumented on the reference page.
- **Plan limits** (DU12). New links: Free 25/month, Pro 12K/year, Business 120K/year, Advanced 600K/year. Custom domains: Free 3, Pro 10, Business 100, Advanced 250. Every plan lists API access. The error returned once the link quota is used up is undocumented.
- **Errors** (DU1, DU3). Envelope `{error: {code, message, doc_url}}`. Codes: `400 bad_request`, `401 unauthorized`, `403 forbidden`, `404 not_found`, `409 conflict`, `410 invite_expired`, `422 unprocessable_entity`, `429 rate_limit_exceeded`, `500 internal_server_error`.
  - Invalid URL: no specific code is documented; it is one of `400` (malformed or wrong types) or `422` (invalid data). Match both.
  - Auth failure: `401`; insufficient permission: `403`.
  - Domain not in the workspace: undocumented. DU13 makes adding the domain to the workspace (then DNS) the setup step, but no page says what create returns for a domain the workspace doesn't have.
- **Click stats** (DU14), for later. `GET /analytics` with `event` (`clicks` default), `groupBy`, `interval`, and `linkId` or `externalId` (`ext_`-prefixed), or `domain`+`key`. Requires Pro or higher. The Link object also carries a `clicks` count.

**Kutt** (REST API v2)

Checked 2026-11-04 against KU1–KU2. The official API reference is a Redoc page whose spec (KU2) is versioned **2.7.4**, while the latest release is v3.2.6 (2026-07-05). Facts below may lag the running server.
- **Domain warning** (KU1). The README says `kutt.it` "is NOT OWNED BY US" and "could be a phishing site"; use `kutt.to`. The API spec's `servers` entry is still `https://kutt.it/api/v2`: never use it.
- **Auth** (KU2). Header `X-API-KEY: <key>`. The `GET /users` response carries `apikey`; key format, length and scopes are undocumented.
- **Base URL** (KU1, KU2). Hosted: the spec's path is `/api/v2`, so `https://kutt.to/api/v2`; the README says all links work on `kutt.to` but doesn't spell out the API URL.
  - Self-hosted: `https://<DEFAULT_DOMAIN>/api/v2` by the same path. `DEFAULT_DOMAIN` is "The domain address that this app runs on" (default `localhost:3000`); `PORT` defaults to `3000`. Runs on Node 20+ or the official Docker image; SQLite, Postgres or MySQL.
  - `DISALLOW_ANONYMOUS_LINKS` defaults to `true`; `DISALLOW_REGISTRATION` defaults to `true` (an admin account is created on first start).
- **Create** (KU2). `POST /links`, JSON body; only `target` (the long URL) is required.
  - `domain`: a string; that it must be one of the user's domains (added with `POST /domains {address, homepage}`) is implied, not stated.
  - `customurl`: the custom slug. Its allowed characters and length are undocumented; generated slugs use `LINK_LENGTH` (default 6) and `LINK_CUSTOM_ALPHABET` (KU1).
  - `reuse`: boolean, default `false`. The spec gives no description of what it does.
  - Also `description`, `expire_in` (e.g. "2 minutes/hours/days"), `password`.
- **Response** (KU2). `200` with the Link object: `id` (uuid), `link` (the full short URL), `address` (the slug), `target`, `description`, `password` (boolean), `banned`, `visit_count`, `created_at`, `updated_at`. No domain field is listed.
- **Idempotency** (KU2). No idempotency key, external id or upsert is documented. `reuse` is the only candidate, and its semantics are undocumented.
- **Lookup** (KU2). `GET /links` with `limit` (example 10), `skip`, and `all` (admin only); response `{limit, skip, total, data[]}`. No filter by target URL, slug, description or external id is documented, so a lookup means paging through the whole list.
- **Rate limits** (KU1). Self-hosted: `ENABLE_RATE_LIMIT` (default `false`) "for some API routes"; which routes and what limits are undocumented. Hosted `kutt.to` limits and plan limits are undocumented.
- **Errors** (KU2). The spec documents `200` responses only. Status codes and bodies for an invalid URL, rate limiting, auth failure, a disallowed domain or a taken `customurl` are all undocumented.
- **Long-URL length.** Undocumented.
- **Click stats** (KU2), for later. `GET /links/{id}/stats` returns `lastDay`, `lastWeek`, `lastMonth`, `lastYear` (each `{stats: {browser, os, country, referrer}, views[]}`), plus the link fields and `visit_count`.

## Sources

- DU1 https://dub.co/docs/api-reference/introduction
- DU2 https://dub.co/docs/api-reference/authentication
- DU3 https://dub.co/docs/api-reference/endpoint/create-a-link
- DU4 https://dub.co/docs/api-reference/endpoint/upsert-a-link
- DU5 https://dub.co/docs/concepts/links/organization
- DU6 https://dub.co/docs/api-reference/endpoint/retrieve-a-link
- DU7 https://dub.co/docs/api-reference/endpoint/update-a-link
- DU8 https://dub.co/docs/api-reference/endpoint/retrieve-a-list-of-links
- DU9 https://dub.co/docs/api-reference/rate-limits
- DU10 https://dub.co/docs/self-hosting
- DU11 https://dub.co/docs/sdks/typescript
- DU12 https://dub.co/pricing/links
- DU13 https://dub.co/help/article/how-to-add-custom-domain
- DU14 https://dub.co/docs/api-reference/endpoint/retrieve-analytics
- KU1 https://github.com/thedevs-network/kutt (README)
- KU2 https://docs.kutt.to (Redoc; spec at https://docs.kutt.to/api.json, version 2.7.4)
