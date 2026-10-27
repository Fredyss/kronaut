# Operations

- **Self-host setup:** step by step in the [self-hosting guide](../guides/self-hosting.md) (compose stack, secrets, Cloudflare Tunnel and Access).
- **FFmpeg and x264 pins (ADR-0054):** to bump them, change the `ARG`s of the `ffmpeg` stage in `infra/docker/Dockerfile` (FFmpeg release tarball from ffmpeg.org, x264 commit on its `stable` branch, each with a sha256 you computed) and the same values in `tools/licenses/native.ts`; a test fails if the two differ.
- **Backups**
  - **Self-host:** `kronaut export` runs nightly. It produces a `pg_dump` plus media, age-encrypted, kept as 7 daily + 4 weekly copies (RPO 24 h). The KEK is exported separately. Import is CLI-only and has a zip-slip test.
    - **Manual:** `kronaut export --out <file>` and `kronaut import <file> --identity <file>`. `kronaut backup run --dir <dir>` makes one archive in `<dir>`, rotates, and prints its path.
    - **Nightly:** the compose service `backup` runs `kronaut backup schedule --dir /backup` with the same image as `cli`. It is the only long-running container that holds the migration credentials (`migration_database_url`, plus `backup_recipient`); it mounts the data volume read-only and the host backup dir at `/backup`, and sits only on the `db` network.
      - **Time:** `KRONAUT_BACKUP_TIME` (`HH:MM`, default `03:30`) in `KRONAUT_BACKUP_TIMEZONE` (IANA, default `UTC`), computed from local wall time with Temporal. A time in a DST gap or overlap resolves with `disambiguation: 'compatible'`, so it runs once per day. An invalid time or zone stops the service at startup.
      - **Catch-up:** at startup, if the newest archive in the dir is older than 24 h, or there is none, a backup runs at once.
      - **Archives:** `kronaut-<UTC YYYYMMDDTHHMMSSZ>.age`, written to `<name>.partial` and then linked into place by the export.
      - **Failures:** a failed run is logged at error level without secrets, retried after 1 h at most twice, then the service waits for the next scheduled time. A missing or empty recipient logs one error per scheduled time and the service keeps waiting instead of exiting. `SIGTERM` lets a run in progress finish, or its `.partial` file is removed.
      - **Status:** after each attempt, `<dir>/last-backup.json` is replaced atomically with `{ ok, at, file?, error? }`. `error` is the error's code or message only.
    - **Rotation (7 + 4):** after a successful export only (a failed run deletes nothing), over file names only. It keeps the newest archive of each of the 7 most recent UTC days that have one, plus the newest archive from each of the next 4 older ISO weeks (UTC) not already covered, so nightly runs reach back about 4 weeks and extra runs on one day never push out older days. It deletes the other archives and `.partial` files older than 24 h. Before each export and when the schedule starts, it also removes `.kronaut-export-*` work dirs with nothing in them changed for 1 h, because an export killed before its cleanup leaves a plaintext `pg_dump` there. It skips this while any `.partial` file changed in the last hour, since another export is then still writing. A cleanup error is logged and never blocks the backup. Files that don't match `kronaut-<timestamp>.age` are never touched.
    - **Off-host copy:** the archives stay on the host. Copy them off the host yourself (for example with rsync or a cloud sync job); a host loss takes the local copies with it.
    - **Archive:** one age stream, encrypted to the X25519 recipient in `KRONAUT_BACKUP_RECIPIENT` (`age1…`). No passphrase mode, and the host that exports never holds the identity. Inside is a plain tar, so `age -d … | tar x` works for manual recovery. It holds `db.dump`, then `media/<storage key>` for each file, then `manifest.json` last, so the media counts are known without holding files open.
    - **Manifest:** format version, creation time, the dump's schema version, the `kek_version`s in use and media counts. It holds no secrets.
    - **Database:** export refuses an instance that has never started (no `instance_state` row), since import must be able to quarantine it. `pg_dump -Fc` runs as the migration role (`KRONAUT_MIGRATION_DATABASE_URL`), which owns the tables and so is not filtered by RLS. `pg_dump`, `pg_restore` and `psql` must be major version 17; the CLI checks this.
    - **Media:** the dump is taken first, then the media directory is copied, skipping the temp dir. Files are opened one at a time. A file that vanishes before it is opened is skipped and counted in the manifest; extra files are harmless.
    - **Not in the archive:** KEKs and `KRONAUT_SECRET`. Back up `secrets/` separately. Import refuses before restoring anything if the keyring lacks a `kek_version` named in the manifest.
    - **Import:**
      - Only into an empty database (no tables in `public`) and an empty media dir; there is no `--force`.
      - It creates the `kronaut_app` and `kronaut_operator` roles if missing, then pipes `pg_restore --no-owner -f -` into `psql -v ON_ERROR_STOP=1` as the migration role, wrapped in an explicit `BEGIN` … `SELECT public.instance_mark_restored(); COMMIT;`. `COMMIT` is sent only after `pg_restore` exits cleanly; `psql --single-transaction` is not used because it commits whenever its input ends, even early. The restore and the quarantine commit together or not at all, so no connection ever sees the restored data unquarantined.
      - Tar entries are whitelisted: exactly `db.dump` first, `media/<valid storage key>` entries, and `manifest.json` last, as regular files only. Anything else aborts the import (the zip-slip test).
      - The archive is opened once, and both passes (validate, then restore) read that same open file. If its size or timestamps change between passes, the import stops.
      - Media is written after the database commits, and the CLI prints the restore epoch and the `kronaut release` step.
  - **Hosted:** PITR for 7 days, plus daily dumps kept 30 days off-region.
  - Every restore enters restore quarantine (ADR-0020), and the restore test in CI goes through quarantine as well.
  - `kronaut restore-complete` calls `instance_mark_restored()` and `kronaut release` calls `instance_release()`. Both run as `kronaut_operator` (ADR-0048); the app itself can only pause.
- **Bluesky app setup (ADR-0050)**: every command runs as `kronaut_operator` (`KRONAUT_OPERATOR_DATABASE_URL`); `key create` also needs the KEKs.
  - `kronaut provider-app register bluesky` registers the app with `client_id` = `<KRONAUT_PUBLIC_URL>/oauth/bluesky/oauth-client-metadata.json` and prints its id.
  - `kronaut provider-app key create <app-id>` adds a `next` key and prints its `kid`; `kronaut provider-app key activate <app-id> <kid>` makes it `active`. `key list <app-id>` shows each `kid`, its status and creation time.
  - **Rotation:** `key create`, then wait for metadata caches to pick up the new key, then `key activate`; the old key becomes `retiring` and keeps signing refreshes for the sessions bound to it. `key delete <app-id> <kid>` removes a `next` or `retiring` key, and the database refuses while any credential is still bound to it. Bound sessions end when their users reconnect or are disconnected.
- **Instagram app setup (ADR-0053)**: Instagram Login on `graph.instagram.com`.
  - Create a Business-type Meta app and add the Instagram use case with "API setup with Instagram login".
  - Register the redirect URI `<KRONAUT_PUBLIC_URL>/v1/oauth/instagram/callback` and set a data-deletion instructions URL in the dashboard.
  - Add a public Instagram professional account as an Instagram Tester.
  - `echo -n "$SECRET" | kronaut provider-app register instagram --client-id <instagram app id>` runs as `kronaut_operator` with the KEKs. It reads the Instagram app secret from stdin (never argv or env), seals it and prints the app id. It refuses while an active Instagram app is registered.
- **Threads app setup (ADR-0053)**: Threads API on `graph.threads.com`. Text, single-image and carousel (2–20 images) posts; no video yet.
  - Add the Threads use case ("Access the Threads API") to the same Meta app, with `threads_basic` and `threads_content_publish`. Meta's docs only describe picking the use case when the app is created; if the dashboard doesn't offer it on the existing app, create a separate app for it.
  - In the use case's settings, add the redirect URI `<KRONAUT_PUBLIC_URL>/v1/oauth/threads/callback` (it must match exactly), plus a deauthorize callback URL and a data deletion requests URL.
  - Use the **Threads app ID and Threads app secret** from the app's settings, not the Meta or Instagram ones.
  - Add each Threads account as a Threads Tester (App roles > Roles > Add People). The account accepts the invite under Account Settings > Website permissions in Threads. Testers need no App Review.
  - `echo -n "$SECRET" | kronaut provider-app register threads --client-id <threads app id>` works like the Instagram command: the Threads app secret comes from stdin, is sealed, and the app id is printed. It refuses while an active Threads app is registered.
  - Tokens last 60 days. The `credential_refresh` job renews each one in its last 7 days.
- **Facebook app setup (ADR-0053)**: Facebook Login and the Pages API on `graph.facebook.com` (v26.0). Pages can publish text posts (links go in the text) and posts with 1–10 JPEG or PNG images. Video and alt text aren't supported yet.
  - Add Facebook Login (or Facebook Login for Business) to the Meta app, with `pages_show_list`, `pages_manage_posts` and `pages_read_engagement`.
  - Set the Valid OAuth Redirect URI to `<KRONAUT_PUBLIC_URL>/v1/oauth/facebook/callback` (Strict Mode: it must match exactly).
  - In Development mode, people with a role on the app can connect the Pages they manage without App Review. Anyone else needs Advanced Access (App Review plus Business Verification).
  - `echo -n "$SECRET" | kronaut provider-app register facebook --client-id <meta app id>` works like the Instagram command: the Meta app secret comes from stdin, is sealed, and the app id is printed. It refuses while an active Facebook app is registered.
  - One login connects every ticked Page the person can create content on, each with its own Page token. Kronaut keeps no user token. Page tokens have no refresh; when one stops working, the channel needs reconnecting.
- **LinkedIn app setup (ADR-0053)**: "Sign In with LinkedIn using OpenID Connect" plus "Share on LinkedIn", both self-serve, posting as the member's personal profile through `api.linkedin.com/rest` (`Linkedin-Version: 202610`, which sunsets 2027-10-15). Text posts, 1 image or 2–20 JPEG or PNG images with optional alt text; no Pages, video or link cards yet.
  - Register the redirect URL `<KRONAUT_PUBLIC_URL>/v1/oauth/linkedin/callback` on the app's Auth tab. Kronaut requests `openid profile w_member_social`.
  - `echo -n "$SECRET" | kronaut provider-app register linkedin --client-id <linkedin client id>` works like the Instagram command, with the app's Client Secret on stdin. It refuses while an active LinkedIn app is registered.
  - Self-serve apps get no refresh tokens: an access token lasts 60 days, the channel gets the expiring notice 7 days ahead, and the member must reconnect.
  - LinkedIn gives a self-serve app no way to read posts back, so `verify.mode` is `none`: an ambiguous send (timeout, 5xx, a 201 without `x-restli-id`) goes to `unconfirmed` and is never sent again automatically.
- **Notification email (SMTP)**: optional. With `KRONAUT_SMTP_HOST` unset, nothing is emailed and the `notification_email` job is not registered.
  - `KRONAUT_SMTP_HOST` (for example `smtp.example.com`) and `KRONAUT_SMTP_PORT` (default 587).
  - `KRONAUT_SMTP_USER` and `KRONAUT_SMTP_PASSWORD` or `KRONAUT_SMTP_PASSWORD_FILE`: optional, but each needs the other. An empty password file counts as no password.
  - **Compose:** the password is the `smtp_password` secret. `init-secrets.sh` creates it empty, so the stack starts without SMTP. To set it, replace the file and rerun the script to restore its owner and mode: `rm -f secrets/smtp_password && (umask 077; printf '%s' "$PW" > secrets/smtp_password) && sh infra/compose/init-secrets.sh`.
  - `KRONAUT_SMTP_FROM`: the sender address, required once the host is set.
  - `KRONAUT_SMTP_TLS`: `starttls` (required STARTTLS, the default), `tls` (implicit TLS, the default on port 465) or `none` (a local relay only). Certificates are always verified.
  - Every minute the worker emails each in-app notification from the last day to its recipient, in their UI language, as plain text. Delivery is at most once and best effort; the in-app notification stays the source of truth.
- **Retention (daily purge job)**: tenant tables are purged per workspace via `sweep_workspaces`; global tables by `purge_instance_retention`, at most 10,000 rows per table per call. `maintain_audit_partitions` keeps audit partitions two months ahead, drops partitions past 400 d and nulls audit PII at 90 d; a non-zero default-partition count is an alert (ADR-0045).

  | Data | Kept for |
  |---|---|
  | `audit_events` + `security_events` | 400 d |
  | `publish_attempts` | 180 d |
  | webhook deliveries | 30 d |
  | notifications | 90 d |
  | credentials of disconnected channels | 30 d |
  | idempotency keys | 24 h (7 d for MCP) |
  | soft-deleted posts | 30 d |
  | `ip_prefix` / `ua_hash` | nulled at 90 d |
  | `deletion_receipts` | forever |
  | expired `sessions`, expired `ephemeral_kv` | purged daily |
  | `inbound_events` | 30 d |
  | `cron_runs` | 90 d |
  | `worker_heartbeats` | 7 d |
  | `rate_buckets` | 30 d idle, unless blocked |

- **GDPR**
  - Workspace export is an async zip.
  - User erasure nulls the PII on `users`; audit rows keep the bare uuid.
  - Hosted workspace deletion has a 7-day grace period, then a cascade, then a `deletion_receipts` row.
  - A disconnected account → its destinations go to `blocked/account_disconnected`, its token is revoked at networks that support it (Mastodon), and credentials are purged after 30 d.
- **Migrations (ADR-0024)**
  - Changes follow expand → deploy → contract.
  - The migrator enforces `lock_timeout=3s`, `CREATE INDEX CONCURRENTLY` and `NOT VALID` + `VALIDATE`.
  - Each migration is tested against the previous release's data.
  - After the Kronaut migrations, the migration role installs or upgrades the `graphile_worker` schema and re-applies the app role's grants on it (ADR-0046).
- **SLOs**
  - ≥ 99.5% of auto destinations are published ≤ 60 s after `scheduled_at` (provider 5xx excluded).
  - **0 duplicates**: any duplicate is a P1.
  - Unconfirmed destinations stay below 0.5%.
  - The admin page shows all three, computed from `publish_attempts`.
- **Health**
  - `/healthz` reports the process; `/readyz` reports the DB and `worker_heartbeats`.
  - Cron health stays out of `/readyz`: a failed maintenance run does not stop the API from serving requests, and a red probe would take the whole instance out of rotation. A failed run is logged at error level, and the admin page shows the last `cron_runs` row per task.
  - Instance-level incidents (`provider_app_incidents`) appear on the admin page; hosted also gets a status page (Phase 3).
- **Rate limits for our own API:** per-grant and per-IP buckets in the same `rate_buckets` table. Redis is not used.
