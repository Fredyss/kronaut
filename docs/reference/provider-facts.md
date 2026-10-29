# Provider facts

Checked against official platform documentation on 2026-10-21. Platforms change: re-verify every fact before building or changing a provider, and update the date here.

**Instagram** (Instagram Login on `graph.instagram.com`, v26.0)

Instagram section re-verified 2026-10-23 (Business Login guide, OAuth and token references, `/me`, content publishing, container, publishing-limit and error references, changelog, Unified Login and migration guides).
- **Setup status.** Meta now recommends the Instagram API with Unified Login for new integrations, and new features ship only there. Existing Instagram Login integrations keep working, with no end date announced.
  - Docs disagree on new apps: the migration guide says newly created apps can't set up Instagram Login, while the create-an-app guide still adds "API setup with Instagram login" automatically.
  - Unified Login is a different flow: the Facebook Login for Business dialog (`www.facebook.com/dialog/oauth` with `config_id`), the Meta app id and secret, a Business Integration System User token (expiry set per configuration), `graph.facebook.com`, `instagram_*` permissions, and account ids from `GET /me/assigned_instagram_accounts`. The app must be owned by a business portfolio, and so must each client account. Instagram User tokens don't carry over: every client reconnects once.
- **Login.** Business Login for Instagram needs no linked Facebook Page. Scopes: `instagram_business_basic,instagram_business_content_publish` (the old `business_*` values stopped working 2025-01-27).
  - Authorize: the host differs between pages: `www.instagram.com/oauth/authorize` in the guide, `api.instagram.com/oauth/authorize` in the reference.
- **First comment** (M66), checked 2026-10-28. `POST /<IG_MEDIA_ID>/comments?message=…` creates a comment and returns `{id}`. With Instagram Login the host is `graph.instagram.com` and the permissions are `instagram_business_basic` and `instagram_business_manage_comments`. Comments on live video aren't supported. M66 gives no length, hashtag or mention limits for a comment.
  - Kronaut: the first comment goes on image, carousel and reel posts. It is checked against the post type's caption limits, Kronaut's own choice since the comment limits are undocumented. New connections request `instagram_business_manage_comments`; only accounts whose granted permissions include it get the comment. A comment whose create call is ambiguous is not matched against the media's comments, so it ends `unconfirmed`.
  - Params: `client_id` (the Instagram app id, not the Meta app id), `redirect_uri` (must exactly match a dashboard entry, which may have gained a trailing slash), `response_type=code`, `scope` (comma-separated or URL-encoded space-separated) and an optional `state`, which is echoed back on the redirect.
  - `force_reauth=true` makes the user enter Instagram credentials even when logged in; Meta recommends it (2025-06-14). `enable_fb_login` (default `true`) was deprecated 2025-06-14 and re-added 2026-02-06. Don't depend on it.
  - Success: `?code=…#_`. The `#_` is not part of the code; it is a fragment, so a server never receives it, but strip it if present. The code is single-use and lives 1 h.
  - Denial: `error=access_denied`, `error_reason=user_denied`, `error_description=The+user+denied+your+request`. Whether `state` is echoed on denial is undocumented (the sample omits it).
  - Since 2026-09-28 the flow's 400 "Session Invalid" error names the underlying reason (checkpointed, unconfirmed); the format is undocumented.
- **Code exchange.** `POST https://api.instagram.com/oauth/access_token` with form fields `client_id`, `client_secret` (the Instagram app secret), `grant_type=authorization_code`, `redirect_uri` (identical to the authorize one) and `code`.
  - The guide's sample response is `{data: [{access_token, user_id, permissions}]}`, with `permissions` a comma-separated string. No reference page confirms the shape, so accept both wrapped and flat. Check that `permissions` contains `instagram_business_content_publish`.
  - Errors are `{error_type, code, error_message}` (e.g. `OAuthException`, `400`, "Matching code was not found or was already used"), not the Graph envelope.
- **Tokens.** The short-lived token (1 h) becomes a long-lived one (60 days) through `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=…&access_token=…`, which needs the app secret and so runs server-side only. Response: `{access_token, token_type: "bearer", expires_in}` (5,184,000 s in the sample).
  - `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=…` needs no secret. It works only on unexpired long-lived tokens at least 24 h old whose user granted `instagram_business_basic`, and grants 60 days from the refresh. Same response shape. A token not refreshed within its 60 days can't be refreshed any more.
  - Store the returned `expires_in`. Whether a refresh rotates the token string is undocumented, so persist whatever comes back.
- **Revocation and callbacks.** No token-revocation endpoint is documented for Instagram Login. Business login settings take a Deauthorize callback URL and a Data deletion request URL; their Instagram payloads, and which secret signs them, are undocumented.
  - Meta's generic data deletion callback is an HTTPS `POST` with a `signed_request` (HMAC-SHA256 with the app secret) carrying an app-scoped `user_id`. It must answer `{url, confirmation_code}`, where `url` shows the deletion status. Every app needs either this callback or a deletion-instructions URL. Re-checked 2026-10-29 (M27): the body is form-encoded, `signed_request` is `<sig>.<payload>` in base64url, the HMAC runs over the encoded payload, and the payload has `algorithm`, `expires`, `issued_at` and `user_id`. Meta sends an alert listing pending user ids every 21 days and asks for prompt deletion; proof is not required. The Instagram and Threads pages (T-use-case, checked 2026-10-29) say only that Meta pings the deauthorize and deletion URLs, so Kronaut assumes the same format keyed by each product's own app secret (ADR-0057).
- **`appsecret_proof`.** Documented only for the Graph API (HMAC-SHA256 of the token keyed with the app secret; required only when "Require App Secret" is on). Undocumented for `graph.instagram.com`, as is which secret (Instagram or Meta app) would key it. Don't rely on it.
- **Account id.** Read `GET https://graph.instagram.com/v26.0/me?fields=user_id,username`. Its `user_id` is the professional account id (`<IG_ID>`, also the `id` in webhooks); `id` is app-scoped. The code exchange calls its own `user_id` "Instagram-scoped" and "app-scoped", so don't store it as the account id.
  - Other fields: `name`, `account_type` (`Business` or `Media_Creator`), `profile_picture_url`, `followers_count`, `follows_count`, `media_count`.
  - The get-started sample also wraps `/me` in `data[]`; accept both shapes.
- **Version.** v26.0 was released 2026-07-29, is still the latest, and has no expiry date yet. A version stays usable until 2 years after its successor ships. Put the version in the path: unversioned calls fall back to an app-level default. The OAuth and token endpoints are documented unversioned.
- **Publish flow.**
  - Single image: `POST /<IG_ID>/media {image_url, caption, alt_text, is_ai_generated}`, with no `media_type`.
  - Carousel: one child container per item `{image_url, is_carousel_item: true, alt_text}`, then the parent `{media_type: 'CAROUSEL', children, caption, is_ai_generated}`. `is_ai_generated` on a child is an error. `caption` on a child is "not supported"; whether it errors is undocumented.
  - Since 2026-09-28, a Facebook-Login-only parameter (such as branded content or caption add-ons) sent to `graph.instagram.com` returns 400 instead of being ignored.
  - Poll `GET /<container>?fields=status_code,status` (`IN_PROGRESS`, `FINISHED`, `ERROR`, `EXPIRED`, `PUBLISHED`) once per minute, for ≤5 min by default. On `ERROR`, `status` holds the error subcode. `9007/2207027` means not ready yet.
  - `POST /<IG_ID>/media_publish {creation_id}` returns `{id}`. There is no idempotency key. A response that carries `config_issue` (`CAPTION_NOT_ATTACHED` or `USER_TAGGING_FAILURE`) is still a success: the media is live without that part.
- **Verify with the container.** The container `status_code` includes **PUBLISHED**. After an ambiguous `media_publish`, polling the container id is a proof of publish, so `verify.mode` is `status_by_ref`, not `list_recent_match`.
  - The container does not link to the media id. Recover it from `GET /<IG_ID>/media?fields=id,timestamp,media_type,permalink,alt_text`; `media_product_type` is Facebook Login only (see Telling reels apart). The caption is not readable under Instagram Login.
  - Graph error 506 "Duplicate Post" is not documented for Instagram.
- **Publish cap.** Read `GET /<IG_ID>/content_publishing_limit?fields=quota_usage,config` before publishing instead of using a constant. The sample response is `{data: [{quota_usage, config: {quota_total, quota_duration}}]}`; the optional `since` is a Unix time at most 24 h back.
  - Docs disagree on the number: the guide's rate-limit section says 100 posts per 24 h; its carousel section, the `media_publish` reference and `quota_total` ("currently 50") say 50. The cap error is `9/2207042`.
  - Separately, 400 containers per rolling 24 h. Containers expire after 24 h.
- **Media hosting.** Meta fetches media by URL, so the URL must be public, US-ASCII, and reachable for the whole attempt: at least until the container is `FINISHED`, ideally until the publish is verified. Fetch timeout, redirect handling, user agent and source IPs are undocumented. Resumable upload exists only with Facebook Login, not IG Login.
- **Errors.** Expired or revoked tokens follow Graph code `190` (subcodes 458–492). `24/2207006` and `36001/2207005` can also mean an expired token.
  - `-2/2207003` (download too slow) is retryable. `-2/2207020` means the container expired: create a new one.
  - `24/2207008` is temporary: retry 1–2 times over 30 s–2 min, and only if the container is not `PUBLISHED`; then create a new container.
  - `9004/2207052`: the media URL could not be fetched. `25/2207050`: the account is restricted until the user acts in the Instagram app. `4/2207051`: suspected spam.
  - `36004/2207010`: caption too long; since 2026-09-28 the message reports the length and the maximum.
- **Composer limits.**
  - Images must be JPEG ≤8MB (no MPO or JPS), with an aspect ratio of 4:5–1.91:1. Widths outside 320–1440 are rescaled, not rejected. Non-sRGB images are converted to sRGB.
  - Reels: 3s–15min, ≤300MB.
  - Stories video ≤60s/100MB.
  - Carousel ≤20 items, no Reels; children are cropped to the first item's ratio (1:1 by default). The error table still says 2–10.
  - Caption ≤2,200 characters (counting unit undocumented), ≤30 hashtags, ≤20 mentions.
  - `alt_text` ≤1,000 characters, images only (single image or carousel image child), since 2025-03-24. `is_ai_generated` since 2026-06-22, available under Instagram Login.
- **Operator setup.** Every self-hosted operator needs their own Business-type Meta app, a registered redirect URI and a public Instagram professional account added as an Instagram Tester. But see Setup status: a new app may not be offered Instagram Login at all.
  - An app that serves only accounts the operator owns or manages needs Standard Access only, with no App Review. Going Live needs a business that has completed Business Verification.
  - There is no delete API under Instagram Login: `DELETE /<IG_MEDIA_ID>` is Facebook Login only.


Instagram video facts checked 2026-10-27 (M1, M2, M11, M15).
- **Reels only.** `media_type=VIDEO` stopped working on 2023-11-09; a single video is a Reel: `POST /<IG_ID>/media {media_type: REELS, video_url, caption, share_to_feed, cover_url | thumb_offset}`. Instagram pulls `video_url`; poll `status_code`, then `media_publish`. Resumable upload is only for Facebook Login for Business apps.
- `share_to_feed: true` shows the Reel in Feed and the Reels tab.
- **Limits** (M2): MOV or MP4, moov atom at the front, no edit lists; H.264 or HEVC, progressive, closed GOP, 4:2:0, 23–60 fps, ≤1920 px wide, aspect 0.01:1–10:1 (9:16 recommended), VBR ≤25 Mbps; AAC ≤48 kHz, mono or stereo, 128 kbps; 3 s–15 min; ≤300 MB.
- **Cover:** `cover_url` (JPEG ≤8 MB, sRGB) or `thumb_offset` in ms; `cover_url` wins. Alt text isn't supported for Reels.
- **Errors** (M11): `-2/2207003` (download too slow) and `-1/2207053` (unknown upload error; make a new container) are retryable; `352/2207026` (format), `1/2207057` (thumb offset) and `9004/2207052` (URL not fetchable) are permanent.
- **Carousel:** a video child is `{media_type: VIDEO, video_url, is_carousel_item: true}`; its limits are undocumented.
- Kronaut: post type `reel` publishes one MP4 (≤300 MB, 3 s–15 min, aspect 0.01:1–10:1) as `{media_type: REELS, video_url, share_to_feed: true, caption, is_ai_generated}`, with no alt text and no cover, so Instagram picks the frame. The container is polled every minute for up to 20 min. `2207053` drops the container and creates a new one; `2207026` fails as `video_format_unsupported`. Recovery matches the only `media_type` `VIDEO` with a timestamp from 2 min before the send onwards; two such videos leave the publish `unconfirmed`.
- **Telling reels apart** (M1, M12, checked 2026-10-29). A published reel reads back as `media_type` `VIDEO`; M1 says to request `media_product_type` (`AD`, `FEED`, `STORY`, `REELS`) to tell a reel apart, but M12 marks that field "Available for Instagram API with Facebook Login only". Whether Instagram Login omits it or rejects the request is undocumented, so Kronaut never asks for it. `caption`, `saved_count`, `shares_count` and `total_views_count` carry the same mark.

**Facebook Page** (Facebook Login and the Pages API on `graph.facebook.com`, v26.0)

Checked 2026-10-27 against M4–M8, M16, M26 and M28–M58. "Undocumented" means none of those pages say it.
- **Version.** v26.0 was released 2026-07-29, is the latest, and has no expiry date yet. v25.0 runs until 2028-07-29. A version stops working 2 years after its successor ships, and calls to an expired one fall through to the next oldest usable version. Unversioned calls use the app-dashboard default, so always put the version in the path; the login dialog is versioned too (`/v26.0/dialog/oauth`). (M16, M28)
- **App setup.** The Pages API docs assume Facebook Login for Business (FLfB), which new Business-type and use-case apps get automatically. (M29, M37)
  - The "Manage everything on your Page" use case forces `business_management`, `pages_show_list` and `public_profile` in as required permissions. (M38)
  - FLfB replaces `scope` with a dashboard `config_id`; in the manual flow `scope` "can still be included" but isn't recommended. FLfB is all-or-nothing: every requested permission must be granted, or the app gets none. (M37)
  - FLfB user tokens use the implicit grant by default and "can support authorization code grant". The manual flow's `response_type=code` is the default. (M30, M37)
- **Login dialog.** `GET https://www.facebook.com/v26.0/dialog/oauth` with `client_id`, `redirect_uri` and `state` (required; echoed back), plus `response_type` and `scope` (comma- or space-separated). (M30)
  - `auth_type=rerequest` re-asks for declined permissions; without it a declined permission is never asked again. `auth_type=reauthorize` restores expired data access. (M30, M39)
  - Strict Mode: `redirect_uri` must exactly match a Valid OAuth Redirect URI, params included; only `state` is ignored. (M31)
  - Denial: `?error_reason=user_denied&error=access_denied&error_description=Permissions+error.` Whether `state` is echoed on denial is undocumented. (M30)
  - PKCE is not documented for this flow.
- **Code exchange.** `GET https://graph.facebook.com/v26.0/oauth/access_token?client_id&redirect_uri&client_secret&code`, with the dialog's `redirect_uri`. Success: `{access_token, token_type, expires_in}`; the failure shape is undocumented. (M30)
  - Code lifetime and single use are not in current docs; a 2012 post says "once" and "within 10 minutes" (M40). Exchange immediately and never retry with the same code.
- **Long-lived user token.** `GET https://graph.facebook.com/v26.0/oauth/access_token?grant_type=fb_exchange_token&client_id&client_secret&fb_exchange_token={short-lived}` returns `{access_token, token_type, expires_in}`, lasting "about 60 days" (the short-lived one lasts one to two hours). Don't depend on either lifetime. An expired token can't be exchanged, and no refresh endpoint is documented: an expired user token means a new login. (M7, M32, M39)
- **Page token.** `GET /v26.0/me/accounts` with a long-lived user token gives Page tokens that "do not have an expiration date and only expire or are invalidated under certain conditions". (M7)
  - Docs disagree: other pages say Page tokens "have an expiration time" or call the `/accounts` token "short-lived". Read `expires_at` from `debug_token` instead of assuming; whether `expires_at: 0` means "never" is undocumented. (M29, M33, M34, M41)
  - A Page token is "unique to each Page, admin, and app combination". (M32)
  - Invalidation is not announced. Documented triggers: logout or password change (`190/460`), de-authorization (`190/458`), a checkpointed or unconfirmed user (`459`, `464`), losing the Page role (`190/492`), security events, and a token leaked to a public GitHub repo. Without the SDKs, check validity "at least daily". (M4, M31, M42, M43)
- **Token check.** `GET /v26.0/debug_token?input_token=…&access_token={app-id}|{app-secret}` returns `app_id`, `user_id`, `is_valid`, `expires_at`, `scopes` and `granular_scopes`; `granular_scopes[].target_ids` lists the granted Page ids and is omitted when a permission covers all of them. (M30, M41)
- **Permission expiry.** Data access expires 90 days after the user was last active, but `pages_*` permissions and `business_management` don't. Separately, a permission the app doesn't use for 90 days "may expire", so a Page with no posts for 90 days may lose `pages_manage_posts`. (M39, M45)
- **Permissions.** Publishing text, link, photo and multi-photo posts needs a Page token from someone with the `CREATE_CONTENT` task, plus `pages_manage_posts`, `pages_read_engagement` and `pages_show_list` (each depends on the next). (M35, M36, M46)
  - Reading `/{page-id}/feed` also needs `pages_read_user_content`. `business_management` isn't needed to publish. (M34, M35)
  - The Posts guide lists more (`pages_manage_engagement`, `pages_read_user_engagement`, and the `MANAGE` and `MODERATE` tasks). (M8)
- **First comment** (M67), checked 2026-10-28. `POST /{object-id}/comments` "publish[es] new comments to any object"; the publishing list includes PagePost, Photo, Post and Video. One of `message`, `attachment_id`, `attachment_share_url`, `attachment_url` or `source` is required. The caller needs a Page token from someone with the `MODERATE` task, or `pages_manage_engagement`. The response is `{id}`. M67 gives no length limit.
  - Kronaut: the first comment is text-only `message`, on both feed posts and reels (a reel is a Video object), commenting as the Page with its Page token. It is checked against the post type's text limits, Kronaut's own choice. New connections request `pages_manage_engagement`; only Pages whose `debug_token` scopes include it get the comment. An ambiguous create is not matched against the object's comments, so it ends `unconfirmed`.
  - Get Started lists `pages_manage_read_engagement`, which isn't a real permission. (M33)
- **Review and access.** Every Page permission needs App Review before live use. Standard Access needs no review but works only for people with a role on the app; Advanced Access needs App Review for each permission plus Business Verification. Apps in Development mode can request any permission from people with a role on the app; Business apps have no app modes. (M6, M29)
  - So a self-hoster posting to Pages they manage, logged in as an app admin, developer or tester, needs no review. Serving anyone else needs Advanced Access, and FLfB adds Ongoing Review. (M6, M29, M37)
- **Page selection.** The dialog lets people share only some of their Pages and change that later. `/me/accounts` returns the Pages the person "has permitted your app to access". (M29, M45, M47)
- **`GET /me/accounts`.** The default object has `access_token`, `category`, `category_list`, `name`, `id` and `tasks` (`ANALYZE`, `ADVERTISE`, `MODERATE`, `CREATE_CONTENT`, `MANAGE`, …); admins get every task. (M7, M29, M34)
  - Request extra fields explicitly, such as `link` ("The Page's Facebook URL") and `username`. `access_token` is returned only to a role "other than Live Contributor". (M48)
  - Paging is cursor-based and ends only when `paging.next` is absent. A page may hold fewer than `limit` results, or none with a `next` link. (M7, M47, M49)
- **Text and link post.** `POST /v26.0/{page-id}/feed {message, link}`; one of the two is required. The response `{id}` is `{page-id}_{post-id}`. There is no idempotency key. A `link` the app can't see fails the post (`1609005`). (M4, M8, M33, M35)
- **Photos.** `POST /v26.0/{page-id}/photos {url | source, caption, alt_text_custom}` returns `{id, post_id}`; `message` is deprecated in favour of `caption`. (M8, M36)
  - Multi-photo: upload each with `published=false`, then `POST /{page-id}/feed {message, attached_media[n]={"media_fbid":"…"}}`. Unused unpublished photos are deleted after about 24 hours. The maximum count is undocumented. (M36)
  - Formats: JPEG, BMP, PNG, GIF and TIFF, at most 10MB; PNGs over 1MB "may appear pixelated". (M36)
  - Alt text: `alt_text_custom`, an "Accessible alternative description for an image". Its maximum length is undocumented; Kronaut caps it at 1,000 UTF-16 units, Instagram's documented limit, and the provider re-checks it before uploading. Whether alt text set on an unpublished photo carries over to the `attached_media` post is undocumented. (M36, checked 2026-10-27)
  - Combining `link` with photos is undocumented: put the URL in the text.
  - Kronaut uploads each photo unpublished as `multipart/form-data` (`source`) and attaches it to the feed post with `attached_media`, even for a single image, then verifies through `published_posts`.
- **Text limits.** The message length is not documented; Kronaut uses 63,206 UTF-16 units. Mentions are `@[page-id]`; tag offsets count code points. (M35, M50)
- **Verification.** `GET /v26.0/{page-post-id}?fields=id,permalink_url,created_time,message,is_published,status_type`; `created_time` may be a UNIX timestamp or ISO 8601, so parse both. The error for a missing post is undocumented. (M50)
  - `list_recent_match` reads `GET /{page-id}/published_posts?fields=id,message,created_time,permalink_url&limit=25` (or `/feed`, which also returns unpublished posts). `limit` is at most 100. (M35, M51)
- **Errors.** Envelope `{error: {message, type, code, error_subcode, error_user_title, error_user_msg, fbtrace_id}}`. (M4)
  - Retry with wait: `1`, `2`, `4`, `17`, `341`. Permissions: `3`, `10`, `200–299`, `283`, `1/2853006` (no task on the Page), `190/2069032` (a Page token is required). (M4, M36, M52)
  - Auth: `190` with subcodes `458`, `459`, `460`, `463`, `464`, `467` or `492`; `102`, or `OAuthException` without a subcode, also means a new token. (M4)
  - `368` (blocked for policy violations): never auto-retry a `public` step. **`506` "Duplicate Post"** maps to `duplicate`. `100` and `324` are permanent. `is_transient` is undocumented: don't key retries on it. (M4, M36)
- **Rate limits.** Page-token calls use Business Use Case limits: 4,800 calls per 24 hours times the number of engaged users, per Page. Throttling returns `80001` (Page token) or `32` (user or app token); platform codes are `4`, `17` and `613`. `X-Business-Use-Case-Usage` reports usage and `estimated_time_to_regain_access` (minutes). Calls made while throttled extend the block. (M5)
  - Kronaut keeps one `account` bucket, `page_calls_day`: 4,800 per 24 h (one engaged user), one unit per post.
- **`appsecret_proof`.** Optional unless "Require App Secret" is on, which then fails every call without it. Docs disagree on the formula: `hex(HMAC-SHA256(key=app_secret, msg=access_token))` (M26), or the same over `access_token|unix_time` with `appsecret_time`, valid 5 minutes (M31). Kronaut sends the M26 form on every call made with a user or Page token. (M26, M31)
- **New Pages Experience.** `/feed`, `/published_posts`, `/photos` and Page posts are supported for it; all classic Pages are being migrated. (M35, M36, M48, M50, M51)
- **2025–2026 changes.** Nothing changes publishing or tokens. v26.0 deprecates some NPE Page fields; from 2026-10-27 `pretty`, `debug`, `date_format`, root `GET /?ids=` and ETags are gone on all versions. Page insights metrics (impressions, reach) were removed in v25.0. (M53–M58)
- **Deletion.** `DELETE /{page_post_id}` returns `{success: true}` (M8), but the Page Post reference says only select developers may use it (M50).


Facebook Page video facts checked 2026-10-27 (M59–M64); the Reels facts were re-checked 2026-10-28 (M60, M62, M65).
- **Reels** (M60, M62): `POST /{page-id}/video_reels upload_phase=start` → `{video_id, upload_url}`; upload to `https://rupload.facebook.com/video-upload/v26.0/{video_id}` with `Authorization: OAuth <page token>`, `offset` and `file_size` and a binary body, or a `file_url` header (pull); poll `GET /{video_id}?fields=status` (`video_status` `uploading|upload_complete|processing|ready|upload_failed|expired|error`, with per-phase detail); then `upload_phase=finish, video_state=PUBLISHED, description`. Resume by re-sending from `bytes_transfered`.
- **Reel specs** (M60): MP4; H.264, H.265, VP9 or AV1; 9:16, ≥540×960 (1080×1920 recommended); 24–60 fps fixed, closed GOP of 2–5 s; AAC-LC stereo 48 kHz ≥128 kbps; **3–90 s**; maximum size undocumented. **30 API-published Reels per Page per 24 h.**
- **Reel errors** (M60): `1363040` aspect ratio, `1363127` resolution, `1363128` duration, `1363129` frame rate; upload errors `OffsetInvalidError`, `PartialRequestError`, `ProcessingFailedError`.
- **Feed video** (M59, M61, M64): Resumable Upload API plus `/{page-id}/videos`; its size, duration and codec limits are undocumented, and M64 calls `graph-video.facebook.com` deprecated while M59 still publishes through it. Kronaut doesn't use it (ADR-0054).
- **Cover:** `POST /{video_id}/thumbnails {source, is_preferred: true}`, image ≤10 MB (M63). Alt text for video is undocumented.
- **Reels details** (M60, M62, M65):
  - Permissions are the photo-post set: `pages_show_list`, `pages_read_engagement` and `pages_manage_posts`, with a Page token from someone with `CREATE_CONTENT`.
  - `start` returns `{video_id, upload_url}`. The upload returns `{success: true}`. `file_url` takes an http(s) URL; a file blocked by robots.txt for Facebook's user agent, or an fbcdn URL, is rejected.
  - Status JSON: `status.video_status` plus `uploading_phase {status, bytes_transfered}`, `processing_phase {status, error}` and `publishing_phase {status, publish_status, publish_time, error}`. Phase `status` is `not_started|in_progress|completed|error`; examples also show `complete`. `publish_status` is `draft|published|scheduled|error`.
  - `finish` takes `video_id`, `video_state` (`DRAFT|PUBLISHED|SCHEDULED`), `description`, `title`, `scheduled_publish_time` (10 min to 29 days ahead) and `is_ai_generated`. The guide shows `{success: true}`; the reference also lists `post_id` and `message`. Publishing finishes after the call, behind copyright checks that "can take a couple of minutes".
  - `GET /{page-id}/video_reels` is not supported. The Video node documents no `permalink_url` or `post_id`, so the video id is the only documented handle.
  - Reels published as a Page story are capped at 60 s. Description length and file size are undocumented. Errors also include `6000` (upload problem, try another file).
- Kronaut publishes one master MP4 as the `reel` post type: exactly 9:16, at least 540×960, 3–90 s, at most 60 fps, within the 300 MB upload cap. It starts the upload, has Facebook pull the signed media URL with `file_url`, and waits for `uploading_phase` to complete before `finish` with `video_state=PUBLISHED`. It then polls the status every 30 s for up to 20 min until `publish_status` is `published`. The remote id is the video id, and the link is `https://www.facebook.com/{video_id}`. `is_ai_generated` follows the media's AI flag; no title, cover or schedule is sent.
- The 30 Reels per Page per day cap isn't pre-checked: Kronaut's rate buckets cover every post type, so a Reels-only bucket would also cap photo posts. Facebook's rejection goes through the normal error mapping.
- Error mapping: `1363040`, `1363127`, `1363128`, `1363129` and `6000` are permanent with their own codes, whether they arrive as `code` or `error_subcode`, and also after the public step. A pull upload that fails with `OffsetInvalidError`, `PartialRequestError` or `ProcessingFailedError` in its body is transient. Neither the envelope for the 13630xx codes nor the rupload error body is documented, so both are matched loosely.

**Threads** (Threads API on `graph.threads.com`, v1.0)

Auth facts verified 2026-10-26 (T3–T6). Publishing facts checked 2026-10-26 against T1, T2, T7 and T8. The same day, the caps, the 500-character limit, the image limits and carousel 2–20 were re-checked against T2; the other composer limits were not.
- **Hosts.** Both are **`.com`**: authorize on `threads.com`, the API on `graph.threads.com` (base `https://graph.threads.com/v1.0`).
- **App credentials.** The Meta app shows two app ids and two secrets; Threads uses the **Threads app id and Threads app secret** (T5).
- **Authorize** (T3). `GET https://threads.com/oauth/authorize` with `client_id` (the Threads app id), `redirect_uri` (must exactly match the app settings), `scope` (comma-separated or URL-encoded space-separated; `threads_basic` is required), `response_type=code` and an optional `state`, echoed back on the redirect.
  - Success: the redirect's code ends with **`#_`, which is not part of the code**: strip it. A code lives 1 h and is single-use.
  - Denial: `error=access_denied`, `error_reason=user_denied`, `error_description=The+user+denied+your+request` (the parameter table misspells it `acceess_denied`).
- **Code exchange** (T3). `POST https://graph.threads.com/oauth/access_token` with form fields `client_id`, `client_secret`, `code`, `grant_type=authorization_code` and `redirect_uri`. Response `{access_token, token_type: "bearer", user_id}`, a short-lived token (1 h).
  - The sample `user_id` is a JSON number above 2^53, so it can't be read safely as a JS number; take the account id from `/me` instead.
  - Errors are `{error_type: "OAuthException", code: 400, error_message}` (e.g. "Matching code was not found or was already used"), not the Graph envelope.
- **Long-lived token** (T4). `GET https://graph.threads.com/access_token?grant_type=th_exchange_token&client_secret=…&access_token=<short-lived>`, server-side only. Response `{access_token, token_type, expires_in}`; valid 60 days. An expired short-lived token can't be exchanged.
- **Refresh** (T4). `GET https://graph.threads.com/refresh_access_token?grant_type=th_refresh_token&access_token=…`, no secret. The token must be at least 24 h old and unexpired, and the user must have granted `threads_basic`. It returns a new `access_token` valid 60 days from the refresh, same shape. A token not refreshed within its 60 days can't be refreshed any more.
- **Profile** (T6). `GET /v1.0/me?fields=id,username,name,threads_profile_picture_url` (also `threads_biography`, `is_verified`) needs `threads_basic`. `id` is a string in the sample.
- **Scopes requested:** `threads_basic,threads_content_publish,threads_manage_replies` (the last since 2026-10-28, for reply chains).
- **Testers** (T5). Without App Review, only Threads Testers (App roles > Roles > Add People) can grant permissions; each accepts under Account Settings > Website permissions. The docs describe adding the Threads use case when the app is created, not on an existing app.
- **Publishing** (T1, T8). Permissions `threads_basic` and `threads_content_publish`.
  - Create a container: `POST /{threads-user-id}/threads` with `media_type` `TEXT`, `IMAGE`, `VIDEO` or `CAROUSEL`. `text` is required for `TEXT` and optional otherwise; `image_url` and `video_url` must be publicly reachable (Kronaut sends a signed media URL). Carousel items carry `is_carousel_item=true`; the carousel container takes `children`, the comma-separated item container ids. The response is `{id}`; ids are kept as strings.
  - Publish: `POST /{threads-user-id}/threads_publish` with `creation_id`, returning `{id}` (for a carousel, the album id). The docs recommend waiting about 30 s after creating a container, so Kronaut returns `pending` for 30 s before its first status read.
  - Read one post: `GET /{media-id}?fields=id,permalink,timestamp`. List own posts: `GET /{threads-user-id}/threads?fields=id,permalink,text,timestamp,media_type,children&limit=…`. Response `media_type` is `TEXT_POST`, `IMAGE`, `VIDEO`, `CAROUSEL_ALBUM`, `AUDIO` or `REPOST_FACADE` (T8). `permalink` can be missing (e.g. copyright-flagged media): the post still counts as published, without a URL.
- **Container status** (T7). `GET /{container-id}?fields=status,error_message`. `status` is `IN_PROGRESS`, `FINISHED`, `PUBLISHED`, `ERROR` or `EXPIRED` (not published within 24 h). `error_message` values are `UNKNOWN` plus video-only codes (`FAILED_DOWNLOADING_VIDEO`, `INVALID_ASPEC_RATIO`, …). Poll once a minute for at most 5 minutes.
  - Kronaut: `ERROR` fails permanently with the `error_message`, except `UNKNOWN`, which drops the container and creates a new one, as `EXPIRED` does. Verification reads the status: `PUBLISHED` is matched against the recent-posts list on text, `media_type` and the carousel's children count; `FINISHED` more than 2 minutes after the send is `absent`.
  - The error response format is not documented; T1 only names the code `THREADS_API__LINK_LIMIT_EXCEEDED`, so Kronaut looks for that string anywhere in the error body.
- **Caps.** 250 posts/24h (a carousel counts as one), 1,000 replies/24h, 100 deletes/24h, enforced at `threads_publish`. Usage is at `threads_publishing_limit` (`quota_usage`, `config.quota_total`, `config.quota_duration`); Kronaut doesn't read it yet and relies on its local `publishes_day` bucket.
- **Replies** (T10), checked 2026-10-28. A reply is a container like any post: `POST /me/threads` with `media_type`, `text` and `reply_to_id` (the id of the post or reply being answered), then `threads_publish` with `creation_id`, returning the reply's media `id`. `reply_to_id` needs the `threads_manage_replies` permission. Replying into a thread is allowed when you own its root post. T10 names no limit on chain length; replies count against the 1,000 replies/24h cap.
  - Kronaut: reply chains are text-only (`TEXT`), each reply answers the previous item, and chains are capped at 24 replies, Kronaut's own cap. New connections request `threads_manage_replies`; an account connected without it publishes the main post only until it reconnects. Replies take a unit from the same per-account bucket as posts, which is stricter than Threads' separate reply cap.
  - Verification: the recent-posts list isn't documented to include replies, so a reply whose container reads `PUBLISHED` after an ambiguous publish is inconclusive and ends `unconfirmed`. `ERROR`, `EXPIRED` and an unpublished `FINISHED` container still prove it absent.
- **Composer limits.**
  - 500 characters, with emoji counted as UTF-8 bytes. Kronaut's `threads` counting: per grapheme cluster of the NFC text, a cluster containing an `Extended_Pictographic` or Regional Indicator code point, U+FE0F (emoji presentation) or U+20E3 (keycap) counts as the UTF-8 byte length of the whole cluster, any other cluster as 1 (😀 = 4, 🇸🇰 = 8, 1️⃣ = 7, a ZWJ family = 25, `čaká` = 4). It errs towards over-counting.
  - **≤5 unique links** in `text` (T1). Since 2025-12-22, more fail at container creation with `THREADS_API__LINK_LIMIT_EXCEEDED`; Kronaut maps it to `permanent` `too_many_links`.
    - Checked 2026-10-27 against T1. Every unique URL in `text` counts, and bare domains count too: T1's examples treat `www.facebook.com` as a link. A `link_attachment` URL that differs from the text's URLs counts as one more; Kronaut doesn't send `link_attachment`.
    - Kronaut sets `maxLinks: 5` and blocks a 6th link in the composer and at schedule and claim time. It counts every bare `name.tld` token as a link on purpose (`node.js` included), so it may reject a post Threads would take but never accepts one Threads rejects.
  - One `topic_tag` of 1–50 characters.
  - Carousel 2–20 items.
  - Images JPEG or PNG, ≤8 MB, aspect ratio up to 10:1, width 320–1440 (rescaled, not rejected).
  - Video ≤5 min/1GB.
- **Verification.** Publish and delete webhooks (2026-04) can confirm `unconfirmed` posts.


Threads video facts checked 2026-10-27 and re-checked 2026-10-28 (T1, T2, T7, T8, T9).
- `POST /{user}/threads {media_type: VIDEO, video_url, text, alt_text}`, poll `status`, then `threads_publish`. Pull only. Kronaut publishes one video as the `video` post type, with the same 5-minute polling window as images; carousels with video are out of scope (ADR-0054).
- **Limits** (T2): MOV or MP4, moov atom at the front, no edit lists; H.264 or HEVC, progressive, closed GOP, 4:2:0, 23–60 fps, ≤1920 px wide, aspect 0.01:1–10:1, VBR ≤100 Mbps; AAC ≤48 kHz, mono or stereo, 128 kbps; longer than 0 s and ≤300 s; ≤1 GB.
- `alt_text` covers images and videos, ≤1,000 characters (T9). No cover parameter.
- Video errors in `error_message` (T7): `FAILED_DOWNLOADING_VIDEO`, `FAILED_PROCESSING_AUDIO`, `FAILED_PROCESSING_VIDEO`, `INVALID_ASPEC_RATIO`, `INVALID_BIT_RATE`, `INVALID_DURATION`, `INVALID_FRAME_RATE`, `INVALID_AUDIO_CHANNELS`, `INVALID_AUDIO_CHANNEL_LAYOUT`, `UNKNOWN`.
- Carousels mix images and videos in 2–20 items (T1).

**Bluesky**

Bluesky re-verified 2026-10-23 (specs, guides, lexicons, live AS/PDS metadata and error responses).
- **Discovery.** handle → DID → DID document → PDS → `GET <pds>/.well-known/oauth-protected-resource` → its single `authorization_servers` entry (a bare https origin) → `GET <as>/.well-known/oauth-authorization-server`. The AS `issuer` must equal the origin it was fetched from. Both documents must answer 200 JSON, with no redirect. Bluesky-hosted PDSes (such as `*.host.bsky.network`) point to `https://bsky.social`.
  - Handles: lowercase them first. Resolve with DNS TXT `_atproto.<handle>` = `did=<did>` (ignore other TXT values; two different DIDs fail) or `GET https://<handle>/.well-known/atproto-did` (2xx, `text/plain`, bare DID, redirects allowed). The two may run in parallel; prefer DNS on conflict.
  - Check both directions: the DID document's `id` equals the DID, and its first valid `at://` entry in `alsoKnownAs` is the handle.
  - `did:plc`: `GET https://plc.directory/<did>`. `did:web`: `GET https://<host>/.well-known/did.json`, hostname only. Reject path-based `did:web`, and ports outside localhost.
  - PDS: the first `service` entry whose `id` ends in `#atproto_pds` (relative or absolute form) and whose `type` is `AtprotoPersonalDataServer`. Its `serviceEndpoint` is a bare https origin.
  - Cache identity resolution for less than 10 min during auth flows.
- **AS (bsky.social).** PAR required, PKCE S256 only, `authorization_response_iss_parameter_supported: true`, auth methods `none` and `private_key_jwt`.
  - Client-assertion and DPoP algorithms: RS256/384/512, PS256/384/512, ES256, ES256K, ES384, ES512. ES256 is the only one every AS must support; Kronaut signs with ES256.
- **Client metadata.** Served at the `client_id` URL: https, no port, status exactly 200 (no redirect), `application/json`. A confidential web client sets:
  - `client_id` (exactly the URL), `application_type: "web"` (the default), `response_types: ["code"]`, `redirect_uris` (https, exact match, no default port);
  - `grant_types: ["authorization_code", "refresh_token"]`. Without `refresh_token`, no refresh token is issued;
  - `scope`: every scope the client may ever request, including `atproto`;
  - `token_endpoint_auth_method: "private_key_jwt"`, `token_endpoint_auth_signing_alg: "ES256"`, `dpop_bound_access_tokens: true`;
  - exactly one of `jwks` (inline) or `jwks_uri` (https), never both.
  - Optional: `client_name`, `client_uri` (same hostname as `client_id`), `logo_uri`, `tos_uri`, `policy_uri`. The AS shows them only for clients it trusts.
  - Any path works. With the conventional name `oauth-client-metadata.json`, the consent page shows the domain instead of the full URL.
  - The AS caches the document and re-fetches it during every session, so the URL must stay reachable for as long as any session lives. For self-hosted installs behind a tunnel, that means the tunnel too.
- **Scopes.** `atproto` is mandatory. `transition:generic` (app-password level: any record, blobs, preferences; no DMs, no account management) is still in bsky.social's `scopes_supported`, but the spec says the transitional scopes will be deprecated and removed.
  - Granular scopes replace them. Image posting needs `atproto repo:app.bsky.feed.post?action=create blob:image/*`.
  - Bluesky's permission set `include:app.bsky.authCreatePosts` grants create on post, postgate and threadgate, plus video RPCs (only with an `aud`). A `blob:` scope can never be in a set.
  - Deleting needs `action=delete`. `putRecord` over an existing record needs `action=update`.
  - The user may grant a subset. The token's `scope` lists what was granted.
- **PAR.** `POST` form body: `client_id`, `response_type=code`, `code_challenge`, `code_challenge_method=S256`, `state`, `redirect_uri`, `scope`, `login_hint`, `client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer` and `client_assertion`, plus a `DPoP` header. The session's DPoP key is used from PAR onwards.
  - `state` is random and never reused, and carries no session data. `login_hint` is the handle or DID exactly as the user typed it.
  - The response carries `request_uri`. Redirect to `authorization_endpoint?client_id=…&request_uri=…`.
- **Callback.** The query carries `state`, `iss`, and either `code` or `error`. Look up the pending request by `state`, and reject unless `iss` equals the issuer bound to it.
- **Client assertion.** A JWT with header `alg: ES256` and `kid`. Claims: `iss` = `sub` = `client_id`, `aud` = the AS `issuer` (not the endpoint URL), a unique `jti`, and `iat`. The AS must accept assertions less than 1 min old, so sign a fresh one for every PAR, token and refresh request.
- **Key binding.** The AS binds each session to the `kid`, `alg` and thumbprint of the client key used at PAR. Refreshes must use that same key, and removing the key from the metadata revokes its sessions.
  - Rotation therefore means: publish the new key, use it for new sessions only, and keep each old key signing that session's refreshes, and published, until its last session ends.
  - The client key is shared by all sessions; the DPoP key belongs to one session. Keep them distinct (ADR-0047). The spec does not say whether an AS rejects a shared key.
- **DPoP proofs.** One fresh JWT per request. Header: `typ: dpop+jwt`, `alg: ES256`, `jwk` (public key). Claims: unique `jti`, `htm`, `htu` (URL without query or fragment), `iat`, `nonce`; on PDS requests also `ath` = base64url(SHA-256(access token)). PDS requests send `Authorization: DPoP <access token>`.
- **DPoP nonces.** Server nonces are mandatory and live at most 5 min. Track one per server (the AS and the PDS differ), take the newest from every `DPoP-Nonce` header, and reject a response to a DPoP request that has no `DPoP-Nonce` header.
  - AS (PAR, token, refresh): `400 {"error":"use_dpop_nonce"}` with a `DPoP-Nonce` header.
  - PDS: `401` with `WWW-Authenticate: DPoP … error="use_dpop_nonce"`, a JSON `{"error":"use_dpop_nonce"}` body and a `DPoP-Nonce` header.
  - Retry once with the new nonce, including on refresh.
- **Token response.** `access_token`, `token_type: "DPoP"`, `expires_in`, `refresh_token`, `scope` and `sub` (the account DID). `scope` is always returned; reject the session if it lacks `atproto`.
- **`sub` check.** When the flow starts from a handle or DID, check that the token's `sub` equals the expected DID, both after the code exchange and before every refresh. When it starts from a server URL, resolve `sub` to its PDS and check that the PDS's AS is the session's issuer.
- **Lifetimes.** Spec limits: access tokens under 30 min (≤15 min if not individually revocable). Confidential refresh tokens ≤180 days each, with no limit on the session. Public-client sessions and refresh tokens ≤2 weeks, so a confidential client is required for scheduling. The patterns guide says confidential sessions last up to 2 years.
  - bsky.social's actual values are undocumented, so store `expires_in`.
  - A 401 `invalid_token` from the PDS can also mean "expired": refresh before treating it as revoked.
- **Refresh tokens.** They are single-use and rotating, so concurrent refreshes need a lock. A crash after refresh therefore loses the session. Same risk class as X: the refresh lease (ADR-0009) must persist the new token before use. The effect of replaying a used refresh token is undocumented; assume it ends the session.
- **Posting.**
  - `uploadBlob` takes any `Content-Type`; send the real one, since the PDS may sniff it. Bluesky PDSes cap a blob at 52,428,800 bytes (50 MB); lexicon limits (`maxSize`, `accept`) are only checked at `createRecord`.
  - Uploaded blobs stay private, and unreferenced ones are garbage-collected ("minutes" per the lexicon; the spec recommends at least 1 h). Upload right before `createRecord`. The blob CID comes from the bytes, so re-uploading the same file returns the same ref.
  - `createRecord` accepts a client-chosen `rkey`. Posts use TID keys: 13 characters matching `^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$`, encoding 53 bits of µs timestamp and a 10-bit clock id.
  - Freezing the record (including `createdAt`) and the rkey before the public step gives `verify.mode` = `deterministic_id`. `getRecord` needs no auth, returns 200 when found and 400 `{"error":"RecordNotFound"}` when absent.
  - Not in the docs or lexicons, and unverified: a duplicate rkey returns 500 `InternalServerError`, so treat that response as ambiguous and never retry it as a fresh create; `putRecord` with an identical record is a 200 no-op.
  - Leave `validate` unset or true.
- **Replies** (B3, B4, B11), checked 2026-10-28. A reply record sets `reply: {root, parent}`, both `com.atproto.repo.strongRef` `{uri, cid}` and both required. `root` is the thread's first post; `parent` is the post being answered. `createRecord` always returns `uri` and `cid`; `getRecord` returns `uri` and `value`, with `cid` optional. The docs name no limit on thread length.
  - Kronaut keeps each item's `cid` as its anchor, sends every reply with `root` = the main post and `parent` = the previous item, keeps reply chains text-only, and caps them at 24 replies, Kronaut's own cap. A verified item without a `cid` in `getRecord` gives no anchor, so the next reply fails permanently instead of guessing.
- **Rate limits.**
  - Writes: 5,000 points/h and 35,000/day per account (create 3, update 2, delete 1).
  - All PDS requests: 3,000 per 5 min **per IP**, so every account of an install on the same PDS shares it. Responses carry `ratelimit-limit`, `-remaining`, `-reset` and `-policy` (`3000;w=300`); over the limit is 429.
  - `createSession` (30 per 5 min, 300/day) only applies to app passwords, which v1 doesn't use (ADR-0035).
- **Composer limits.**
  - Text ≤300 graphemes and ≤3,000 UTF-8 bytes. It may be empty when there is an embed. ≤3 `langs`; ≤8 `tags` of ≤64 graphemes.
  - `app.bsky.embed.images`: ≤4 images, `image/*`, ≤2,000,000 bytes each (the docs page still says 1,000,000). `alt` is required but may be empty. `aspectRatio` `{width, height}` (integers ≥1) is optional; omit it rather than guess. Strip EXIF: the docs leave that to the client.
  - `app.bsky.embed.gallery` is new: the schema allows 20 images, and clients should cap authoring at 10. Each image is ≤2,000,000 bytes and needs `alt` and `aspectRatio`.
  - Link-card thumbnails ≤1,000,000 bytes.
  - Video: mp4 ≤300 MB through the video service (`uploadVideo`, or the multipart `startUpload`/`uploadPart`/`finishUpload`), with a daily per-account quota from `getUploadLimits`.
- **Client-built content.** The client builds link cards (OG fetch + thumbnail blob) and facets.
  - A facet's `index` is `byteStart` (inclusive) and `byteEnd` (exclusive), counted in UTF-8 bytes of `text`.
  - Features: `mention {did}`, `link {uri}` (the full URL, even when the text shortens it), `tag {tag}` (without `#`, ≤64 graphemes).


Bluesky video facts checked 2026-10-27 (B3, B7, B18, B19).
- **Video service** (B18): `com.atproto.server.getServiceAuth {aud: did:web:<PDS host>, lxm: com.atproto.repo.uploadBlob, exp}`; `POST https://video.bsky.app/xrpc/app.bsky.video.uploadVideo?did&name` with the service token and the body; poll `app.bsky.video.getJobStatus` until `jobStatus.blob`; post with `app.bsky.embed.video {video, aspectRatio, alt?}`. An `already_exists` error still carries the blob. Bluesky-hosted accounts need a verified email.
- **Multipart** (B3, since 2026-08-12): `startUpload {sizeBytes, mimeType, durationMs?, width?, height?}` → `{jobId, partSizeBytes, partCount, expiresAt}`; idempotent `uploadPart` and `finishUpload`; errors `VideoTooLarge`, `VideoTooLong`, `BadAspectRatio`, `DailyLimitExceeded`, `TooManyOpenUploads`, `UploadForbidden`, `ServiceOverloaded`, with undocumented thresholds.
- **Job states:** `JOB_STATE_CREATED`, `ENCODING`, `ENCODED`, `SCANNING`, `SCANNED`, `UPLOADING`, `UPLOADED`, `COMPLETED`, `FAILED`; `failureCode` `validation_failure`, `encoding_failure`, `pds_upload_failure`, `pds_upload_unsupported_blob_size`, `generic_failure`.
- **Limits:** `video/mp4` only, ≤300,000,000 bytes (raised 2026-08-11); duration, resolution and codec limits undocumented. `getUploadLimits` returns the daily quota; an unauthenticated call is 401 (B19).
- **OAuth:** `authCreatePosts` grants the `app.bsky.video.*` methods with `inheritAud`, while the tutorial mints `lxm=com.atproto.repo.uploadBlob` for the PDS. Which `aud`/`lxm` the video service accepts from an OAuth session is undocumented and needs a live test.
- One embed per post: a video can't be combined with images. `alt` is optional; `captions` takes up to 20 VTT files.

**Mastodon**
- **Idempotency.** The `Idempotency-Key` header on `POST /api/v1/statuses` is kept for 1h: a repeat with the same key returns the original status (MA1). It needs a re-send to use, so the verifier never relies on it; `verify.mode` = `list_recent_match` (see Publishing below).
- **Per-instance values.** Limits come from each instance's `/api/v2/instance` (max_characters, max_media_attachments, characters_reserved_per_url, media sizes, description_limit). The app must be registered per instance.
- **Async media.** `POST /api/v2/media` returns 202. Poll `GET /api/v1/media/:id` (206 while processing, 200 when done).

Mastodon connect facts re-verified 2026-10-26 (MA4, MA5, MA6, MA2).
- **App registration** (MA6). `POST /api/v1/apps` is public and needs no token.
  - Params: `client_name`, `redirect_uris` (a string or an array; arrays from 4.3), `scopes` (space-separated, default `read`), `website`.
  - Returns `client_id`, `client_secret` and, from 4.4, `client_secret_expires_at`. From 4.3 apps are no longer removed automatically.
  - A missing or malformed parameter is 422 with `{"error": "Validation failed: …"}`.
- **Authorize** (MA4). `GET /oauth/authorize` with `response_type=code`, `client_id`, `redirect_uri`, `scope`, `state`. PKCE takes `code_challenge` + `code_challenge_method=S256` from 4.3; S256 is the only method.
- **Token** (MA4). `POST /oauth/token` with `grant_type=authorization_code`, `code`, `client_id`, `client_secret`, `redirect_uri`, plus `code_verifier` when PKCE was used.
  - Returns `access_token`, `token_type`, `scope`, `created_at`: no expiry and no refresh token.
  - `POST /oauth/revoke` takes `client_id`, `client_secret`, `token` as form data and needs no user token. 200 with `{}` when the app owns the token; 403 `unauthorized_client` for a token it doesn't own or a missing one. Repeating it still returns 200. Re-verified 2026-10-27 (MA4).
- **Account.** `GET /api/v1/accounts/verify_credentials` needs `read:accounts` and returns `id`, `username`, `acct`, `display_name`, `url`. Ids are local to the server.
- **Instance** (MA5). `GET /api/v2/instance`:
  - `configuration.statuses` (from 4.0): `max_characters` (example 500), `max_media_attachments` (4), `characters_reserved_per_url` (23).
  - `configuration.media_attachments`: `supported_mime_types`, `image_size_limit` (16,777,216 bytes), `image_matrix_limit` (33,177,600 px), `video_size_limit` (103,809,024 bytes), all from 4.0; `description_limit` (1,500) from 4.4, so it may be absent.
- **Rate limits** (MA2). 300 calls per 5 minutes per account and per IP; media uploads 30 per 30 minutes per account. Headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- **Scopes requested:** `read:accounts read:statuses write:statuses write:media`. `read:statuses` (added 2026-10-26) lets the verifier read the account's statuses; accounts connected before then lack it and get only public statuses, which is enough for a `public` post.

Mastodon publishing facts checked 2026-10-26 (MA1, MA3, MA7, MA8).
- **Media** (MA3). `POST /api/v2/media`, multipart `file` (required), `description`, `focus`; needs `write:media`. 200 when processed, 202 while processing (`url` null). `GET /api/v1/media/:id`: 206 processing, 200 done, 422 processing error, 404 not yours.
- **Statuses** (MA1). `POST /api/v1/statuses` with form params `status`, `media_ids[]`, `sensitive`, `spoiler_text`, `visibility`, `language`, `in_reply_to_id`. 401 for a bad token, 422 for validation errors; the response is a Status with `id`, `url`, `uri`.
- **Posting limits** (MA8). Default 500 characters; every link counts as 23 characters; a mention counts only its username part, not the domain. Up to 4 images of at most 16 MB in PNG, JPG, HEIF, WEBP or AVIF; the server's `supported_mime_types` is authoritative. GIF is out of scope (it becomes a video attachment).
  - **Unverified:** the docs don't say whether a character is a grapheme or a code point. Kronaut counts graphemes (`mastodon` counting strategy).
- **Recent statuses** (MA7). `GET /api/v1/accounts/:id/statuses`: public for public statuses, or a user token with `read:statuses`; `limit` default 20, max 40; `exclude_reblogs`. The sort order isn't stated; the id cursors imply newest first, which the verifier assumes. 401 only in whitelist mode or for a bad token, 404 for an unknown account.
- **Rate limits** (MA2). Media uploads 30 per 30 min per account; everything else 300 per 5 min.
- **Replies** (MA1), checked 2026-10-28. `in_reply_to_id` is the "ID of the status being replied to". MA1 doesn't say how visibility relates to the parent, whether replying to your own status is restricted, or what a missing parent returns; `Idempotency-Key` keys are kept for up to 1 hour.
  - Kronaut: each reply sets `in_reply_to_id` to the previous item's status id, uses the same `public` visibility as the main post and its own idempotency key per position, keeps reply chains text-only, and caps them at 24 replies, Kronaut's own cap.


Mastodon video facts checked 2026-10-27 and re-checked 2026-10-28 (MA3, MA5, MA8).
- `POST /api/v2/media {file, thumbnail, description, focus}`; video is always 202 with `url` null; poll `GET /api/v1/media/:id` (206, 200, 422).
- Per instance (MA5, from 4.0): `video_size_limit` (example 103,809,024 bytes), `video_frame_rate_limit` (example 120), `video_matrix_limit` (example 8,294,400 px). MA8: MP4, M4V, MOV, WebM up to 99 MB; the server transcodes to H.264 MP4 at up to 1,300 kbps and 120 fps. Duration limit undocumented. One video per post; mixing a video with images is undocumented.
- `description` (≤ `description_limit`) applies to video too; `thumbnail` sets a cover.
- Kronaut publishes one master MP4 as the `video` post type. Its limits come from the instance: `video_size_limit`, `video_frame_rate_limit` and `video_matrix_limit`, with the MA5 examples as fallbacks. The duration cap is the pipeline's 15 min. Compose checks all three limits; the server preflight checks size and pixels, because the frozen snapshot carries no frame rate. Kronaut sets no `thumbnail`.

**LinkedIn** (member posting through "Sign In with LinkedIn using OpenID Connect" and "Share on LinkedIn", `api.linkedin.com/rest`, 202610)

Checked 2026-10-27 against L1–L5 and L8–L25. Scope: a member's personal profile through the two self-serve products, without Community Management or Marketing approval. "Not documented" means none of those pages say it.
- **Versioning** (L4, L8, L9).
  - Every `/rest/*` call needs `Linkedin-Version: YYYYMM`; "the latest version is not applied by default" (L4). Each monthly version is supported for at least a year, with security, privacy and bug-fix patches inside that window.
  - Active on 2026-10-27: 202511 and 202601–202610 (there was no 202512). 202511, the oldest, sunsets 2026-11-16; 202510 sunset 2026-10-15. **Kronaut pins 202610, which sunsets 2027-10-15** (`apiVersion.sunsetOn`).
  - A missing header gives `400 VERSION_MISSING`; a sunset version gives `426 NONEXISTENT_VERSION`.
  - `X-Restli-Protocol-Version: 2.0.0` is required on every Posts and Images call (L3, L10). The legacy `/v2/ugcPosts` and `/v2/assets` need it too, but no version header (L2).
  - **Contradiction:** L11 calls the version header `X-LinkedIn-Version`; every other page says `Linkedin-Version`.
- **Authorize** (L12, L25). `GET https://www.linkedin.com/oauth/v2/authorization` with `response_type=code`, `client_id`, `redirect_uri` and `scope` (required, "URL-encoded, space-delimited"; default scopes aren't allowed), plus `state` (optional on the web flow; Kronaut always sends it).
  - Scopes are all-or-nothing: the member can't pick individual ones. `enable_extended_login=true` turns on Google, Apple and passkey login outside desktop and Android web (L12, L20); Kronaut doesn't send it.
  - The redirect URI must match a registered Redirect URL, be absolute and HTTPS. Query parameters on a registered URL are ignored and `#` is invalid. A mismatch gives 401 "Redirect_uri doesn't match". Trailing-slash and case rules are not documented.
  - Denial: `redirect_uri?error=…&error_description=…&state=…`, with `error` `user_cancelled_login` or `user_cancelled_authorize`. Other values are not documented.
  - The code lives 30 minutes and "must be used immediately" (L12; L13 says only "very short lifespan"). Single use is not documented. A bad code gives `401 invalid_request` ("authorization code not found") or `400 invalid_redirect_uri`.
- **PKCE** (L13, L15). Documented only for native clients at `/oauth/native-pkce/authorization`, with loopback redirects only and per-app enablement through a LinkedIn contact. PKCE on the web flow is not documented, and the discovery document has no `code_challenge_methods_supported`. Kronaut uses the confidential web flow with `client_secret`.
- **Token exchange** (L12). `POST https://www.linkedin.com/oauth/v2/accessToken`, form-encoded: `grant_type=authorization_code`, `code`, `client_id`, `client_secret` and `redirect_uri` (the same value).
  - The response has `access_token` (about 500 characters; plan for 1000+), `expires_in` ("all access tokens are issued with a 60-day lifespan"; the sample is `5184000`) and `scope` (comma-separated). `refresh_token` and `refresh_token_expires_in` come only when programmatic refresh is enabled.
  - `id_token`: L14 says it is returned, but the L12 response table doesn't list it. Its lifetime is not documented. Kronaut doesn't use it.
- **OIDC discovery** (L14, L15). The live `https://www.linkedin.com/oauth/.well-known/openid-configuration` has `issuer` `https://www.linkedin.com/oauth`; **L14 documents `iss` as `https://www.linkedin.com`**, so validate against the live document. `subject_types_supported: ["pairwise"]`, RS256, JWKS at `https://www.linkedin.com/oauth/openid/jwks`, scopes `openid profile email`.
- **Scopes** (L2, L3, L10, L14, L16–L18). Self-serve: `profile` and `email` (OpenID Connect product) and `w_member_social` (Share on LinkedIn). `openid` is required for the ID token; L16's table omits it. **Kronaut requests `openid profile w_member_social`.**
  - `r_member_social` is restricted to approved users (L3, L10, L17). `r_liteprofile` and `r_basicprofile` are restricted too (L18).
- **First comment** (L2, L26), checked 2026-10-28. Comments go through `POST /rest/socialActions/{shareUrn|ugcPostUrn}/comments` with `actor`, `object` and `message.text`. The Comments API lists `w_member_social_feed` to "post, comment, and react" for a member, a Community Management permission that needs app review (L7). Share on LinkedIn's `w_member_social` is described only as "required to create a LinkedIn post" (L2).
  - Kronaut: no first comment on LinkedIn for now, since the self-serve products don't grant comment access. Revisit once a vetted Community Management app is available.
- **Token lifetime and refresh** (L1, L11–L13, L19).
  - Access tokens last 60 days. **Self-serve apps get no refresh tokens**: programmatic refresh is for approved MDP partners (L1, L12). Where it exists, the refresh token lives 365 days from first consent and refreshing doesn't extend it; L1's samples (`expires_in: 86400`, `refresh_token_expires_in: 525600`) contradict its own text.
  - Re-authorization before expiry is the documented "refresh" for self-serve apps: the consent screen is skipped while the member is logged in and the token is still valid. Whether the new token's 60 days restart is implied, not stated.
  - **Contradiction:** L12 says a member may hold several valid tokens for the same scope; L13 lists a later OAuth flow as a cause of invalidation. Both agree that a different scope invalidates all earlier tokens, so a re-auth must replace the stored token atomically.
  - Revocation shows as 401 "The token has been revoked", expiry as 401 "Expired access token" (L11); their `serviceErrorCode` values are not documented. **Downstream token-verification failures return 500**, not 401 (L11, L13). LinkedIn may revoke any token at any time (L1).
  - Introspection: `POST https://www.linkedin.com/oauth/v2/introspectToken` with `client_id`, `client_secret` and `token` returns `active`, `status` (`active|expired|revoked`), `expires_at`, `created_at`, `authorized_at` and `scope` (L19). Its rate limit is not documented. Kronaut doesn't call it yet.
- **Member identity** (L2, L14, L15, L18).
  - `GET https://api.linkedin.com/v2/userinfo` (Bearer) returns `sub`, `name`, `given_name`, `family_name`, `picture`, `locale` and the optional `email` and `email_verified`. Whether `picture` expires is not documented.
  - The author is a Person URN; L2 points to the OIDC page for it. No page says `urn:li:person:{sub}` verbatim, but it is the only route the docs offer. **Kronaut builds `urn:li:person:{sub}`.**
  - `sub` is pairwise: unique to one app, so each self-hosted app sees a different id for the same member.
  - No public profile URL or vanity name with these scopes (`vanityName` needs `r_basicprofile`). Kronaut stores no handle and no profile URL.
- **Which endpoint** (L2, L3, L17). Share on LinkedIn (last updated 2023-12-14) documents only the legacy `POST /v2/ugcPosts` and `/v2/assets?action=registerUpload`. The Posts API lists `w_member_social` for `POST /rest/posts` and says it "replaces the ugcPosts API", but every example uses an organization author. The legacy page says its deprecation applies to "partners with Marketing permissions only". No page confirms or forbids `/rest/posts` for a self-serve member app. **Kronaut uses `/rest/posts` and `/rest/images`**, which carry the yearly version expiry.
- **Create a post** (L3, L10, L22).
  - Required: `author`, `commentary`, `visibility` (`PUBLIC`, `CONNECTIONS`, `LOGGED_IN` or `CONTAINER`), `distribution` (`{feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: []}`) and `lifecycleState` (`PUBLISHED` is the only value accepted on create). `isReshareDisabledByAuthor` is optional, default false.
  - Success is **201** with the URN in the **`x-restli-id`** header, either `urn:li:share:…` or `urn:li:ugcPost:…`; don't assume the type.
  - `PUBLISH_REQUESTED` and `PUBLISH_FAILED`, with `lifecycleStateInfo.contentStatus`, can appear in responses. Whether that happens for member text or image posts is not documented, and a `w_member_social` app can't read the post to see it.
  - The only documented post URL is `https://www.linkedin.com/feed/update/urn:li:ugcPost:<id>/`; the same pattern for `urn:li:share:` is not documented. Kronaut uses `https://www.linkedin.com/feed/update/{urn}` for both.
  - `DELETE /rest/posts/{encoded urn}` is idempotent and returns 204.
- **Images** (L2, L10, L17, L21, L23).
  - Init: `POST /rest/images?action=initializeUpload` with `{"initializeUploadRequest":{"owner":"urn:li:person:{id}"}}` returns `value.uploadUrl` (on `www.linkedin.com/dms-uploads/…`), `value.uploadUrlExpiresAt` (epoch ms) and `value.image` (`urn:li:image:…`). For member owners "the caller must match the image owner". `SYNCHRONOUS_UPLOAD` isn't supported.
  - Upload: "Use a PUT method" with the OAuth token in `Authorization`; the sample answers 201 (L21). The image `Content-Type` is not documented. **Contradiction:** L2 says `POST` to the `uploadUrl`, but its sample is a PUT.
  - Status: `GET /rest/images/{urn}` gives `WAITING_UPLOAD`, `PROCESSING`, `AVAILABLE` or `PROCESSING_FAILED`, but L10 says `w_member_social`-only tokens can't make that GET (and, in the next note, that they can for legacy calls). Treat it as unavailable. If an image fails processing "the post won't be visible to members" (L21); that can't be ruled out before posting.
  - Limits: fewer than 36,152,320 pixels; JPG, GIF (≤250 frames) and PNG (L10, L21). **Contradiction:** L21 also says only JPEG and PNG. **Maximum file size: not documented**; L21 lists `413 REQUEST_ENTITY_TOO_LARGE` without a number. Kronaut allows JPEG and PNG up to 8 MB.
  - One image: `content.media: {id, altText}`. `altText` is at most 4,086 characters (120 recommended) (L10, L17); the post schema gives no length (L22).
  - Several images: `content.multiImage.images[]`, 2–20 `urn:li:image:` entries, organic only (L23). `w_member_social` is listed, but every sample is an organization. **Contradiction:** the L23 schema puts `altText` on `multiImage`, the sample on each image. Kronaut sends it on each image.
  - Expiry or garbage collection of unused images is not documented; only the upload URL expires.
- **Text** (L3, L5, L17).
  - Length: "maximum length of the text of a UGC Post is 3,000 characters" (L17, legacy). The Posts API states no number, only `400 FIELD_LENGTH_TOO_LONG` (L3), and the counting unit is not documented. **Kronaut uses 3,000 UTF-16 code units, counted on the raw text before escaping.**
  - The commentary is **little text**: `\ | { } @ [ ] ( ) < > # * _ ~` must be backslash-escaped "even if those characters are not used in one of the supported elements" (L5). Mentions are `@[Name](urn)`; a hashtag `#word` comes back as `{hashtag|\#|word}`. Kronaut escapes every reserved character, backslash first, so it sends no mentions or hashtag elements.
  - The legacy UGC text is plain with `attributes[]` offsets; escaping an apostrophe there gives `400 "Unrecognized character escape"` (L17), so the escaper is per endpoint.
  - "The Posts API does not support URL scraping for article post creation" (L3). Whether a bare URL in `commentary` gets a preview card is not documented.
- **Reading back** (L3, L10, L17). Not possible with `w_member_social` alone: find-by-author needs `r_member_social`, `w_member_social` is "write-only" for GETs, and the legacy GET-by-URN can return 401 "Member doesn't have author access". GET `/rest/posts/{urn}` isn't documented either way; treat it as unavailable. **An ambiguous create can't be verified, so Kronaut's `verify.mode` is `none` and it becomes `unconfirmed`.** The legacy duplicate error returns the existing URN, but probing with it would re-send a public write.
- **Errors** (L3, L9, L11, L17).
  - Envelope `{"message","serviceErrorCode","status"}`; the newer `code`, `errorDetailType` and `errorDetails` are documented only for ad endpoints (L9). The Posts table uses names such as `ACCESS_DENIED` and `UNPROCESSABLE_ENTITY`. Kronaut never stores `message`.
  - 401: empty, invalid, expired or revoked token. 403 `ACCESS_DENIED` (legacy: "Not enough permissions to access: POST {endpoint}"). 409 `CONFLICT` "A write conflict occurred. Retry the request."; on a create that is still ambiguous.
  - 422 duplicate is documented only on legacy UGC: "Content is a duplicate of {share or UGC URN}", an exact duplicate of a recent post, "Wait 10 minutes" (L17). The Posts API lists only a generic `422 UNPROCESSABLE_ENTITY`.
  - Kronaut: 401 is `auth_revoked` (the runtime can't see the stored expiry), 403 `permission_missing`, 400 `invalid_request`, 422 `duplicate` when the message says so and `unprocessable` otherwise, 429 `rate_limited` until the next 00:00 UTC, 413 on an upload `image_too_large`. On `create_post`, a timeout, any 5xx, any other status or a 2xx without `x-restli-id` is `ambiguous`; on uploads a 5xx, 409 or timeout is `transient`.
- **Rate limits** (L2, L11, L17, L24).
  - 429: "Resource level throttle limit for calls to this resource is reached" (L11); legacy "a share limit has been reached", the author's daily share limit (L17); or infrastructure protection (L24). `Retry-After` is not documented.
  - Daily limits reset at midnight UTC: member **150** and application **100,000** requests per day (L2). L24 says "Standard rate limits are not published", which contradicts L2; the real per-endpoint values show in the Developer Portal Analytics tab after the first call. An email alert goes out at 75% of the app quota only, 1–2 h late (L24).
  - **Kronaut: one `account` bucket `member_posts_day`, 150 per day, 1 per post.** It models only `POST /rest/posts`: LinkedIn throttles per resource (L11, L24). `initializeUpload` and the image `PUT` (2 calls per image) have their own limits, which are not documented. A 429 on any step still parks the account until 00:00 UTC.
- **Changelog 2025–2026** (L20). Nothing changes the Images API, the OIDC claims or token lifetimes. Relevant items: member post statistics need `r_member_postAnalytics` (2025-06, not self-serve); a 75% app-quota email (2025-09); Google and Apple sign-in with `enable_extended_login` from 2025-12-02 (2025-11). Page dates: Posts API 2026-05-13, Images API 2026-06-24, OAuth flow 2026-05-15, versioning 2026-10-14.
- **Out of scope:** article cards must be supplied by the client (L3).


LinkedIn video facts checked 2026-10-27 and re-checked 2026-10-28 (L3, L6, L22).
- `POST /rest/videos?action=initializeUpload {initializeUploadRequest: {owner, fileSizeBytes, uploadCaptions, uploadThumbnail}}` → `{video, uploadToken, uploadInstructions[{firstByte, lastByte, uploadUrl}]}`; `PUT` each 4 MiB part as `application/octet-stream` and keep its `etag`; `POST ?action=finalizeUpload {video, uploadToken, uploadedPartIds}`; post with `content: {media: {id: urn:li:video:…, title}}`.
- Status `GET /rest/videos/{urn}`: `WAITING_UPLOAD|PROCESSING|AVAILABLE|PROCESSING_FAILED`. Whether a `w_member_social`-only token may read it is undocumented. A member owner is allowed ("the caller needs to match the video owner"). Upload URLs expire together, typically 30 days after init; an expired URL gives 401. The `PUT` sample sends `Content-Type: application/octet-stream` and returns the part id in `etag`.
- **Limits:** MP4, 3 s–30 min, 75 KB–500 MB (the `fileSizeBytes` field says 5 GB). Codecs, aspect and frame rate undocumented.
- Errors: 400 `EXPIRED_UPLOAD_URL`, `MEDIA_ASSET_PROCESSING_FAILED`, `MEDIA_ASSET_WAITING_UPLOAD`, `UPDATING_ASSET_FAILED`. No video in `multiImage`.
- The post may reference a video that is still processing: `lifecycleState` can come back `PUBLISH_REQUESTED`, which is "published asynchronously once the processing has successfully completed", or `PUBLISH_FAILED` (L3, L22). `content.media.altText` covers "image or video" (L22); `title` is optional.
- Kronaut publishes one master MP4 as the `video` post type: init, 4 MiB parts, finalize, then a status read while it is `PROCESSING` (polled every 30 s for up to 30 min). If the status read is refused (401 or 403), it posts anyway and relies on `PUBLISH_REQUESTED`. Upload URLs are never stored; a crash before finalize starts a new upload. Captions, thumbnail and title aren't sent. The 75 KB minimum file size isn't checked.

**YouTube**
- **Upload quota.** The upload bucket is 100/day **per project**, so the bucket key is `app:`, not `account:`. Other calls, such as thumbnails, use the 10,000-unit bucket. Both reset at midnight Pacific.
- **Resumable upload.** It returns a session URI. Storing it allows resume and status queries after a crash, which is a natural `status_by_ref`.
- **Composer limits.** Title ≤100 **characters**; description ≤5,000 **bytes**; `<` and `>` are forbidden in both.
- **Upload status.** It can become `rejected` or `failed` after the id is returned.

**TikTok**
- **Mandatory UX.** The upload page must:
  - show the creator's nickname, read live from `creator_info`;
  - offer privacy as a **manual choice with no default**, limited to `privacy_level_options`;
  - leave the comment, duet and stitch toggles **unchecked by default**, greyed out where disabled;
  - show a preview;
  - show the music-usage consent text;
  - support commercial-disclosure toggles, where branded content cannot be private.

  Content must be sent only after the user's express consent. A "schedule now, decide privacy later" flow is non-compliant.
- **Audit policy.** "A utility tool to help upload contents to the account(s) you or your team manages" is **not acceptable**, and neither is copying content from other platforms. Also, `client_secret` must not be embedded in open source.
- **Rate limits.** Init 6/min, status fetch 30/min per token.
- **Video.** MP4/WebM/MOV, 23–60fps, 360–4096px, ≤4GB, ≤10 min sent (the user's cap may be lower).
  - Chunks 5–64MB, ≤1,000, sequential.
- **Photos.** Up to 35 per post, JPEG/WebP ≤1080p/20MB, through PULL_FROM_URL only.
- **PULL_FROM_URL.** Requires a **verified domain or URL prefix**, https with no redirects. The guidelines say servers should not use FILE_UPLOAD.
- **Status.** `PUBLISH_COMPLETE` and `FAILED` carry a `fail_reason`. `publicaly_available_post_id` appears only for **public posts that passed moderation**, so SELF_ONLY posts never get a post id.
- **Error codes.** `spam_risk_too_many_posts` maps to `rate_limited` (daily). `reached_active_user_cap` and `unaudited_client...` map to `app_config`. `privacy_level_option_mismatch` is permanent.

**X**
- **Pricing.** Cost depends on content: a URL makes a post 13× more expensive. The composer and cost forecast must detect URLs.
- **Credit balance.** A zero or negative balance blocks all requests. This is an app-level, `app_config`-type incident, not a per-account one.
- **Rate limits.** `POST /2/tweets`: 100/15 min per user, 10,000/24h per app.
- **Character counting.** Limit 280, NFC-normalized; any emoji counts as 2 (including ZWJ sequences), URLs count as 23. Use `twitter-text`.
- **Media.**
  - Up to 4 images (≤5MB), or 1 GIF (≤15MB), or 1 video.
  - Video: 20 min/8GB, or 125 min/16GB for Premium. Limits follow the **user's** Premium status.
  - A successfully finalized media_id can still be rejected at `POST /2/tweets` (403 duration error).
- **Upload v2.** Dedicated paths (`/2/media/upload/initialize`, `/{id}/append`, `/{id}/finalize`); `command=INIT` style is gone.
- **Duplicates and idempotency.** The docs have no idempotency key and no documented duplicate-content error code.

**Pinterest**
- **Tokens.** Access token 30d. Apps created after 2025-09-25 get a **continuous refresh token of 60d**, and each refresh returns a new one, so it is `rotating` with a 60-day inactivity death. The legacy 365-day hard token is no longer supported.
- **Invalidation.** Tokens are invalidated by a username or password change, without notice.
- **New-app restriction.** Apps registered on or after **2026-09-14** may get `403 PINNER_DATA_ACCESS_DENIED` for **non-business users'** boards and Pins. A Kronaut app registered now is affected.
- **Composer.** `board_id` is required. Organic formats are image or video Pins only.
- **Video.** Register with `/v5/media`, POST to S3 (204), poll `GET /v5/media/{id}` until it succeeds, then create the Pin with a **mandatory `cover_image_url`**.

**Google Business Profile**
- **API access.** Requires an application with a GBP that has been **verified and active for 60+ days**, plus a website. Quota-increase forms are not the path.
- **Edits.** **10 edits per minute per profile, which cannot be increased.**
- **Local posts.** `localPosts` is still v4. `state` is PROCESSING, LIVE, REJECTED, SCHEDULED or RECURRING, so posts are async with a possible policy rejection.
  - Native `scheduledTime` is supported.

**Analytics** (checked 2026-10-29 against the official docs linked below)
- **Mastodon.** `GET /api/v1/statuses/:id` returns `replies_count`, `reblogs_count`, `favourites_count`, and `quotes_count` from 4.5.0, so older servers lack it. A public status needs no token; a private one needs `read:statuses`, which Kronaut already requests. `GET /api/v1/statuses?id[]=…` batches from 4.3.0; its maximum isn't documented, and it may return fewer statuses than asked. Rate limits: 300 per 5 min per account and per IP. `verify_credentials` returns `followers_count`. These are live counters, with no history. Sources: https://docs.joinmastodon.org/methods/statuses/, https://docs.joinmastodon.org/entities/Status/, https://docs.joinmastodon.org/api/rate-limits/
- **Bluesky.** `app.bsky.feed.getPosts` takes up to 25 URIs and returns `likeCount`, `repostCount`, `replyCount`, `quoteCount` and `bookmarkCount`. `app.bsky.actor.getProfile` returns `followersCount`. The public AppView `public.api.bsky.app` needs no auth; it is cached and its limits aren't published. Live counters, with no history. Sources: the `bluesky-social/atproto` lexicons `app/bsky/feed/getPosts.json`, `app/bsky/feed/defs.json`, `app/bsky/actor/defs.json`, and `bluesky-social/bsky-docs` `docs/advanced-guides/rate-limits.md`.
- **Facebook Page.**
  - Public counts: `GET /{post-id}?fields=shares,reactions.limit(0).summary(total_count),comments.limit(0).summary(total_count)` with the Page token (`pages_read_engagement`).
  - Real insights (`/{post-id}/insights`: `post_media_view`, `post_total_media_view_unique`, `post_clicks`, `post_reactions_by_type_total`, video metrics) need `read_insights` and a Page with 100+ likes. They cover the last 2 years and mostly refresh daily. All `post_impressions*` metrics are gone (2025-06-15 / 2025-11-15).
  - Sources: https://developers.facebook.com/docs/graph-api/reference/post/, https://developers.facebook.com/docs/graph-api/reference/insights/, https://developers.facebook.com/documentation/pages-api/platforminsights/page/deprecated-metrics
  - `shares` is a struct with a `count` key; the reference doesn't say whether it's omitted at 0, so a missing `shares` is stored as NULL. `reactions` and `comments` take `summary=total_count`; comments' `total_count` can exceed the visible comments (privacy, deletion). The Page `followers_count` field is documented, but the reference names no permission for it, and its Page-owned-data permissions include `pages_read_user_content`, which Kronaut doesn't request, so Kronaut reads no Facebook follower count. Checked 2026-10-29: https://developers.facebook.com/docs/graph-api/reference/object/reactions/, https://developers.facebook.com/docs/graph-api/reference/object/comments/, https://developers.facebook.com/docs/graph-api/reference/page/
- **Instagram.**
  - `GET /{ig-media-id}/insights` needs `instagram_business_manage_insights`. Metrics: `views`, `reach`, `likes`, `comments`, `saved`, `shares`, `reposts`, `total_interactions`, plus Reels watch-time metrics. Up to 48 h delay, 2 years kept. Missing data comes back as an empty set, not 0.
  - Removed: `video_views` (2025-01-08); `plays` and `impressions` (2025-04-21; `impressions` only for media created on or after 2024-07-02).
  - Album children have no insights.
  - Story metrics live 24 h, and values under 5 return error 10.
  - Accounts outside the app's roles need Advanced Access.
  - Sources: https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights, https://developers.facebook.com/docs/graph-api/changelog/version22.0/
- **Threads.** `GET /{media-id}/insights?metric=views,likes,replies,reposts,quotes,shares` and `/{user-id}/threads_insights` (`followers_count`) need `threads_manage_insights`, which goes through App Review. `views` and `shares` are in development. Source: https://developers.facebook.com/docs/threads/insights
- **LinkedIn.** Member post statistics (`memberCreatorPostAnalytics`) need `r_member_postAnalytics`, which comes only with the Community Management API for registered legal organizations. `w_member_social` gives no stats. Source: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/post-statistics?view=li-lms-2026-10

## Sources

- U1 https://github.com/nodejs/undici/blob/main/docs/docs/api/DiagnosticsChannel.md
- M1 https://developers.facebook.com/documentation/instagram-platform/content-publishing
- M2 https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/media
- M3 https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login
- M4 https://developers.facebook.com/docs/graph-api/guides/error-handling
- M5 https://developers.facebook.com/docs/graph-api/overview/rate-limiting
- M6 https://developers.facebook.com/docs/graph-api/overview/access-levels
- M7 https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived
- M8 https://developers.facebook.com/docs/pages-api/posts
- M9 https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-container
- M10 https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/content_publishing_limit
- M11 https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/error-codes
- M12 https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media
- M13 https://developers.facebook.com/documentation/instagram-platform/reference/access_token
- M14 https://developers.facebook.com/documentation/instagram-platform/reference/refresh_access_token
- M15 https://developers.facebook.com/documentation/instagram-platform/changelog
- M16 https://developers.facebook.com/docs/graph-api/changelog/versions
- M17 https://developers.facebook.com/documentation/instagram-platform/reference/oauth-authorize
- M18 https://developers.facebook.com/documentation/instagram-platform/reference/me
- M19 https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/get-started
- M20 https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/media_publish
- M21 https://developers.facebook.com/documentation/instagram-platform/overview
- M22 https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login (with its `/authentication` and `/get-started` pages)
- M23 https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/migration-guide
- M24 https://developers.facebook.com/documentation/instagram-platform/create-an-instagram-app
- M25 https://developers.facebook.com/documentation/instagram-platform/app-review
- M26 https://developers.facebook.com/docs/graph-api/guides/secure-requests
- M27 https://developers.facebook.com/documentation/development/create-an-app/app-dashboard/data-deletion-callback
- M28 https://developers.facebook.com/docs/graph-api/guides/versioning
- M29 https://developers.facebook.com/documentation/pages-api/overview
- M30 https://developers.facebook.com/documentation/facebook-login/guides/advanced/manual-flow
- M31 https://developers.facebook.com/documentation/facebook-login/security
- M32 https://developers.facebook.com/documentation/facebook-login/guides/access-tokens
- M33 https://developers.facebook.com/documentation/pages-api/getting-started
- M34 https://developers.facebook.com/documentation/pages-api/manage-pages
- M35 https://developers.facebook.com/docs/graph-api/reference/page/feed
- M36 https://developers.facebook.com/docs/graph-api/reference/page/photos
- M37 https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business
- M38 https://developers.facebook.com/documentation/pages-api/create-an-app
- M39 https://developers.facebook.com/documentation/facebook-login/auth-vs-data
- M40 https://developers.facebook.com/blog/post/2012/09/05/platform-updates--operation-developer-love/
- M41 https://developers.facebook.com/docs/graph-api/reference/debug_token
- M42 https://developers.facebook.com/docs/facebook-login/access-tokens/debugging-and-error-handling
- M43 https://developers.facebook.com/documentation/facebook-login/access-tokens/security
- M44 https://developers.facebook.com/documentation/facebook-login/guides/permissions/request-revoke
- M45 https://developers.facebook.com/documentation/facebook-login/guides/permissions
- M46 https://developers.facebook.com/docs/permissions
- M47 https://developers.facebook.com/docs/graph-api/reference/user/accounts
- M48 https://developers.facebook.com/docs/graph-api/reference/page
- M49 https://developers.facebook.com/docs/graph-api/results
- M50 https://developers.facebook.com/docs/graph-api/reference/page-post
- M51 https://developers.facebook.com/docs/graph-api/reference/page/published_posts
- M52 https://developers.facebook.com/documentation/pages-api/error-codes
- M53 https://developers.facebook.com/docs/graph-api/changelog/version26.0
- M54 https://developers.facebook.com/docs/graph-api/changelog/version25.0
- M55 https://developers.facebook.com/documentation/pages-api/changelog
- M56 https://developers.facebook.com/docs/graph-api/changelog/version22.0
- M57 https://developers.facebook.com/docs/graph-api/changelog/non-versioned-changes/nvc-2025
- M58 https://developers.facebook.com/docs/graph-api/changelog/version24.0 (also version23.0, and https://developers.facebook.com/docs/graph-api/changelog/out-of-cycle-changes)
- M59 https://developers.facebook.com/docs/video-api/guides/publishing
- M60 https://developers.facebook.com/docs/video-api/guides/reels-publishing
- M61 https://developers.facebook.com/docs/graph-api/reference/page/videos/
- M62 https://developers.facebook.com/docs/graph-api/reference/page/video_reels/
- M63 https://developers.facebook.com/docs/graph-api/reference/video/thumbnails/
- M64 https://developers.facebook.com/docs/video-api/overview
- M65 https://developers.facebook.com/docs/graph-api/reference/video/
- M66 https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/comments
- M67 https://developers.facebook.com/docs/graph-api/reference/object/comments
- T1 https://developers.facebook.com/docs/threads/posts
- T2 https://developers.facebook.com/docs/threads/overview
- T3 https://developers.facebook.com/docs/threads/get-started/get-access-tokens-and-permissions
- T4 https://developers.facebook.com/docs/threads/get-started/long-lived-tokens
- T5 https://developers.facebook.com/docs/threads/get-started (with https://developers.facebook.com/docs/development/create-an-app/threads-use-case)
- T6 https://developers.facebook.com/docs/threads/threads-profiles
- T7 https://developers.facebook.com/docs/threads/troubleshooting
- T8 https://developers.facebook.com/docs/threads/threads-media
- T9 https://developers.facebook.com/docs/threads/reference/publishing
- T10 https://developers.facebook.com/documentation/threads/retrieve-and-manage-replies/create-replies
- B1 https://bsky.network/docs/rate-limits (docs.bsky.app now 308-redirects to bsky.network)
- B2 https://atproto.com/specs/oauth
- B3 https://github.com/bluesky-social/bsky/tree/main/lexicons (canonical for `app.bsky.*`: app/bsky/feed/post, embed/images, embed/gallery, embed/external, embed/video, richtext/facet, video/getUploadLimits, authCreatePosts)
- B4 https://bsky.network/docs/about-bluesky-content/posts
- B5 https://atproto.com/specs/handle
- B6 https://atproto.com/specs/did
- B7 https://atproto.com/specs/blob
- B8 https://atproto.com/specs/record-key
- B9 https://atproto.com/specs/xrpc
- B10 https://bsky.social/.well-known/oauth-authorization-server
- B11 https://github.com/bluesky-social/atproto/tree/main/lexicons (canonical for `com.atproto.*`: com/atproto/repo/createRecord, getRecord, putRecord, uploadBlob)
- B12 https://atproto.com/specs/permission
- B13 https://atproto.com/guides/oauth-patterns and https://atproto.com/guides/permission-requests
- B14 https://atproto.com/specs/tid
- B15 https://web.plc.directory/spec/v0.1/did-plc and https://w3c-ccg.github.io/did-method-web/
- B16 https://datatracker.ietf.org/doc/html/rfc9449 (DPoP, referenced by B2)
- B17 Live checks on 2026-10-23: a Bluesky-hosted PDS's `/.well-known/oauth-protected-resource`, its unauthenticated `getRecord` miss, and `use_dpop_nonce` responses from bsky.social `/oauth/par`, `/oauth/token` and the PDS
- B18 https://github.com/bluesky-social/bsky-docs/blob/main/docs/tutorials/video.mdx
- B19 Live check on 2026-10-27: unauthenticated `GET https://video.bsky.app/xrpc/app.bsky.video.getUploadLimits` returned 401
- MA1 https://docs.joinmastodon.org/methods/statuses/
- MA2 https://docs.joinmastodon.org/api/rate-limits/
- MA3 https://docs.joinmastodon.org/methods/media/
- MA4 https://docs.joinmastodon.org/methods/oauth/
- MA5 https://docs.joinmastodon.org/entities/Instance/
- MA6 https://docs.joinmastodon.org/methods/apps/
- MA7 https://docs.joinmastodon.org/methods/accounts/
- MA8 https://docs.joinmastodon.org/user/posting/
- L1 https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens
- L2 https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
- L3 https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
- L4 https://learn.microsoft.com/en-us/linkedin/marketing/versioning
- L5 https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/little-text-format
- L6 https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api
- L7 https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review
- L8 https://learn.microsoft.com/en-us/linkedin/marketing/integrations/migrations
- L9 https://learn.microsoft.com/en-us/linkedin/marketing/error-responses
- L10 https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api
- L11 https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/error-handling
- L12 https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
- L13 https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow-native
- L14 https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
- L15 https://www.linkedin.com/oauth/.well-known/openid-configuration (live document)
- L16 https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access
- L17 https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/ugc-post-api
- L18 https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api
- L19 https://learn.microsoft.com/en-us/linkedin/shared/authentication/token-introspection
- L20 https://learn.microsoft.com/en-us/linkedin/marketing/integrations/recent-changes
- L21 https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/vector-asset-api
- L22 https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/post-api-schema
- L23 https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/multiimage-post-api
- L24 https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits
- L25 https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/migration-faq (last updated 2023)
- L26 https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/comments-api
- Y1 https://developers.google.com/youtube/v3/determine_quota_cost
- Y2 https://developers.google.com/youtube/v3/docs/videos/insert
- Y3 https://developers.google.com/youtube/v3/revision_history
- Y4 https://developers.google.com/youtube/v3/docs/videos
- G1 https://developers.google.com/identity/protocols/oauth2
- K1 https://developers.tiktok.com/doc/content-sharing-guidelines
- K2 https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
- K3 https://developers.tiktok.com/doc/oauth-user-access-token-management
- K4 https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide
- K5 https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status
- K6 https://developers.tiktok.com/doc/content-posting-api-reference-photo-post
- X1 https://docs.x.com/x-api/getting-started/pricing
- X2 https://docs.x.com/resources/fundamentals/authentication/oauth-2-0/authorization-code
- X3 https://docs.x.com/x-api/fundamentals/rate-limits
- X4 https://docs.x.com/x-api/media/quickstart/media-upload-chunked
- X5 https://docs.x.com/x-api/media/quickstart/best-practices
- X6 https://docs.x.com/resources/fundamentals/counting-characters
- X7 https://docs.x.com/x-api/posts/create-post
- P1 https://developers.pinterest.com/docs/getting-started/access-tiers/
- P2 https://developers.pinterest.com/docs/getting-started/authentication-and-scopes/
- P3 https://developers.pinterest.com/docs/reference/rate-limits/
- P4 https://developers.pinterest.com/docs/api-features/creating-boards-and-pins/
- GB1 https://developers.google.com/my-business/content/prereqs
- GB2 https://developers.google.com/my-business/content/limits
- GB3 https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts
- MD1 https://github.com/Medium/medium-api-docs
