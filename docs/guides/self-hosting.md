# Self-hosting Kronaut

Phase 0 guide. The stack runs five containers: `app` (`--role=all`), `media` (`--role=media`), `postgres`, `cloudflared` and `backup` (nightly archives). Two one-shot containers run beside them: `migrate`, and `cli` for operator commands. Nothing publishes a port. Cloudflare Tunnel is the only way in.

Replace `example.com` with your own domain throughout.

## 1. Requirements

- A Linux host (amd64 or arm64) with Docker Engine and Docker Compose v2. Run the commands as a user in the `docker` group.
- A domain on Cloudflare. The free plan is enough, and so is Cloudflare One (Zero Trust) on its free tier.
- About 1.5 GB of free RAM: the stack idles under 250 MB, and converting a video takes up to about 600 MB on top (a 4K source). The app container is capped at 1 GB.
- `git`, `openssl` and a POSIX `sh` on the host.

## 2. Install

```sh
git clone <your clone URL of the Kronaut repository> kronaut
cd kronaut/infra/compose
sh init-secrets.sh
cp .env.example .env
```

- **`init-secrets.sh`:**
  - Writes every missing file in `secrets/` at the repository root and never overwrites an existing one. It creates the Postgres superuser, app login and operator login passwords, the matching database URLs, `instance_id`, `kronaut_secret`, the first KEK (`kek_1`) and an empty `backup_recipient`.
  - Then sets each file to mode `0400`, owned by the one container user that reads it. Files named `postgres_*` go to uid 70 (the Postgres image), and all others go to uid 65532 (the Kronaut and cloudflared images). On Linux the script does this through a short-lived `alpine` container, so you don't need `sudo`. On macOS it only sets the mode.
  - Afterwards you can no longer read the files as your own user. That is intended.
  - Rerunning the script is safe. It fixes the owner and mode of files you added by hand, such as the tunnel token.
- **`.env`:** set `KRONAUT_PUBLIC_URL` and `KRONAUT_MEDIA_URL` now. The two Access values come from step 3.
- **Back up `secrets/` somewhere safe.** The KEKs and `kronaut_secret` are not part of any backup archive (see [Operations](../architecture/11-operations.md)). On Linux, read the directory with `sudo`, because its files belong to the container users.

Run every `docker compose` command below from `infra/compose`.

## 3. Cloudflare

These are the dashboard names as of 2026-10-24. Sources:

- [Create a remotely-managed tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/)
- [Tunnel run parameters](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/cloudflared-parameters/run-parameters/), for `--token-file`, which needs cloudflared 2025.4.0 or later
- [Self-hosted public application](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
- [Access policies](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)
- [Validate JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Getting started FAQ](https://developers.cloudflare.com/cloudflare-one/faq/getting-started-faq/), for the team domain

### Tunnel

1. Go to **Networking > Tunnels**, select **Create a tunnel** and give it a name.
2. The next page shows an install command that contains the tunnel token, the long string after `--token`. Copy only the token. Don't run the command, because the `cloudflared` container is the connector.
3. Save the token and fix its owner:

   ```sh
   (umask 077; cat > ../../secrets/cloudflared_token)   # paste the token, then Ctrl-D
   sh init-secrets.sh
   ```

4. Open the tunnel's **Routes** tab and select **Add route > Published application** twice:

   | Subdomain | Domain | Service URL |
   |---|---|---|
   | `kronaut` | `example.com` | `http://app:3000` |
   | `media` | `example.com` | `http://media:3000` |

### Access

1. **App application:**
   - Go to **Zero Trust > Access controls > Applications**, select **Create new application**, then **Self-hosted and private**, then **Add public hostname** `kronaut.example.com`.
   - Attach an **Allow** policy that matches only you, for example your email address. Applications deny by default.
2. **OAuth bypass:**
   - Create a second self-hosted application for `kronaut.example.com/oauth/*` with a single **Bypass** policy (include: Everyone).
   - Providers fetch these public documents server-to-server, for example the Bluesky client metadata, so they can't log in to Access.
   - Bypass requests are not logged by Access. Kronaut only skips the Access check for `GET /oauth/<provider>/<name>`.
3. **No Access application on `media.example.com`.** Providers fetch media directly, and signed URLs protect the files.
4. **AUD tag:** in **Applications**, select **Configure** on the app application (the first one). Under **Additional settings**, copy the **Application Audience (AUD) Tag** into `ACCESS_AUD` in `.env`.
5. **Team domain:** under **Zero Trust > Settings**, copy `<team>.cloudflareaccess.com` into `ACCESS_TEAM_DOMAIN`.

With both set, the app also verifies the `Cf-Access-Jwt-Assertion` header on every request. The exceptions are `/healthz`, `/readyz` and `GET /oauth/*` (see [Security](../architecture/06-security.md)).

## 4. Start

```sh
docker compose up -d --build
docker compose ps
```

- **Startup order:** `migrate` applies the schema and exits with 0, then `app` starts, then `cloudflared` starts once `app` is healthy. In `docker compose ps`, `app` and `media` show `(healthy)`.
- **Health from inside the network:**

  ```sh
  docker compose exec app /nodejs/bin/node -e "require('node:http').get('http://127.0.0.1:3000/readyz', (r) => console.log(r.statusCode))"
  ```

  From outside, `https://kronaut.example.com/` asks for the Access login.
- **Create the owner:**

  ```sh
  docker compose run --rm cli kronaut user create --owner --email you@example.com --name "Your Name" --workspace "My workspace" --timezone Europe/Bratislava
  ```

  It prints a one-time link (`<KRONAUT_PUBLIC_URL>/reset-password#token=…`) that is valid for 15 minutes; open it to set your password. `kronaut user reset-password <email>` issues a new one.
- **Instance health page (optional):** put your email in `KRONAUT_INSTANCE_ADMINS` in `.env` and restart. Settings → System then shows the publishing SLOs, background jobs, provider incidents and API version sunsets. It is off while the variable is empty.

## 5. Provider apps

Follow [Bluesky app setup](../architecture/11-operations.md), [Instagram app setup](../architecture/11-operations.md), [Threads app setup](../architecture/11-operations.md), [Facebook app setup](../architecture/11-operations.md) and [LinkedIn app setup](../architecture/11-operations.md) in the Operations chapter. Run each `kronaut …` command there as `docker compose run --rm cli kronaut …`.

Commands that read stdin need `-T`:

```sh
printf '%s' "$INSTAGRAM_APP_SECRET" | docker compose run --rm -T cli kronaut provider-app register instagram --client-id <instagram app id>
printf '%s' "$THREADS_APP_SECRET" | docker compose run --rm -T cli kronaut provider-app register threads --client-id <threads app id>
printf '%s' "$META_APP_SECRET" | docker compose run --rm -T cli kronaut provider-app register facebook --client-id <meta app id>
printf '%s' "$LINKEDIN_CLIENT_SECRET" | docker compose run --rm -T cli kronaut provider-app register linkedin --client-id <linkedin client id>
```

### Facebook Pages

Kronaut connects Facebook Pages, not personal profiles. One login can add several Pages: Meta's login dialog asks which Pages to share, and each ticked Page you can create content on becomes its own channel.

- **In the Meta app:**
  - Add Facebook Login (or Facebook Login for Business).
  - Set the Valid OAuth Redirect URI to `https://kronaut.example.com/v1/oauth/facebook/callback`, using your own host. It must match exactly.
  - Request the `pages_show_list`, `pages_manage_posts`, `pages_read_engagement` and `pages_manage_engagement` permissions.
  - Register the app with its Meta app ID and app secret, using the `register facebook` command above.
- **Access:**
  - In Development mode, anyone with a role on the app (admin, developer or tester) can connect the Pages they manage. That needs no App Review.
  - Anyone else needs Advanced Access to those permissions, which takes App Review plus Business Verification.
- **Reconnecting:** to add a Page you left out, connect Facebook again and tick it. Pages you untick keep their channel until their token stops working.

### LinkedIn

Kronaut posts to a member's personal LinkedIn profile, not to a LinkedIn Page. Each member connects their own profile. It needs no partner approval.

- **In the LinkedIn developer portal:**
  - Create an app on [linkedin.com/developers](https://www.linkedin.com/developers/apps).
  - On the Products tab, add **Sign In with LinkedIn using OpenID Connect** and **Share on LinkedIn**. Both are self-serve.
  - On the Auth tab, add the redirect URL `https://kronaut.example.com/v1/oauth/linkedin/callback`, using your own host.
  - Register the app with its Client ID and Client Secret, using the `register linkedin` command above.
- **Posts:** text, 1 image, or 2–20 JPEG or PNG images of up to 8 MB, with optional alt text.
- **Reconnecting:** LinkedIn gives these apps no refresh tokens, so every connection lasts 60 days. Kronaut sends an expiring notice 7 days ahead; the member then reconnects LinkedIn from Channels.
- **Unconfirmed posts:** Kronaut can't read LinkedIn posts back. If LinkedIn's answer to a send gets lost, the post is marked unconfirmed rather than sent twice; check the profile before sending it again.

## 6. Backups, upgrades and logs

The `backup` service starts with the stack and makes an encrypted archive every night. Set up the backup recipient and the backup dir below before the first `docker compose up`; until the recipient is set, the service logs an error at each scheduled time and makes no archive.

- **Backup recipient (once):**
  - Generate an age identity on another machine (`age-keygen -o kronaut-identity.txt`) and keep it there. The host that exports never holds the identity.
  - Put its `age1…` public key on the host and fix the owner:

    ```sh
    rm ../../secrets/backup_recipient
    (umask 077; echo 'age1…' > ../../secrets/backup_recipient)
    sh init-secrets.sh
    ```

    If the stack is already running, restart the service afterwards: `docker compose restart backup`.

- **Backup dir (once, Linux):** the `backup` and `cli` containers write as uid 65532 into `data/backups` at the repository root.

  ```sh
  mkdir -p ../../data/backups
  docker run --rm -v "$PWD/../../data/backups:/b" alpine:3.24.2@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6 chown 65532:65532 /b
  ```

- **Nightly backup:** runs at `KRONAUT_BACKUP_TIME` (default `03:30`) in `KRONAUT_BACKUP_TIMEZONE` (default `UTC`), both set in `.env`. At startup it runs one at once if the newest archive is older than 24 h. It keeps one archive for each of the last 7 days plus one from each of the 4 weeks before them, about a month back, and deletes the rest. Work folders left by an interrupted backup (`.kronaut-export-*`) are removed too. Other files in `data/backups/` are left alone.
- **Check the last run:**

  ```sh
  cat ../../data/backups/last-backup.json
  docker compose logs backup
  ```

  `{"ok":true,"at":"…","file":"kronaut-….age"}` means the last attempt worked; `"ok":false` carries an `error`. A failed run is retried after 1 h, at most twice.
- **Manual backup:**

  ```sh
  docker compose run --rm cli kronaut backup run --dir /backup
  ```

  It prints the archive path and rotates like the nightly run. `kronaut export --out /backup/<file>.age` still writes a single archive without rotation.
- **Copy archives off the host.** They land in `data/backups/` and are lost with the host; sync that directory somewhere else, for example from cron.
- **Import:** only into a fresh stack with the old `secrets/` restored. Put the archive and, briefly, the identity file into `data/backups/`, then:

  ```sh
  docker compose up -d postgres
  docker compose run --rm cli kronaut import /backup/<file>.age --identity /backup/kronaut-identity.txt
  rm ../../data/backups/kronaut-identity.txt
  docker compose up -d
  ```

  The instance comes up in restore quarantine. Review the paused posts, then run `docker compose run --rm cli kronaut release`.
- **Upgrade:** `git pull`, then `docker compose up -d --build`. `migrate` runs automatically before the new `app` starts.
- **Logs:** `docker compose logs -f app`, or `media`, `migrate`, `backup`, `cloudflared`, `postgres`. Logs are JSON lines and never contain secrets.
- **Local database access (debugging only):** `postgres` sits on an internal network, so a published port also needs a second network. Create `compose.override.yaml` next to `compose.yaml`; compose picks it up automatically. Delete it when you are done.

  ```yaml
  services:
    postgres:
      ports: ["127.0.0.1:5432:5432"]
      networks: [db, debug]
  networks:
    debug: {}
  ```

## 7. Troubleshooting

- **A plain 403 from the app** (not the Cloudflare login page):
  - The Access assertion was missing or invalid. The reason is logged at warn level in `docker compose logs app`.
  - Check that `ACCESS_AUD` is the AUD of the app application (not of the bypass one) and that `ACCESS_TEAM_DOMAIN` matches **Zero Trust > Settings**.
  - A request that reaches the app without passing Access, for example through a route that isn't covered by the Access application, also gets this 403.
- **A provider can't fetch `/oauth/…`:** the bypass application is missing, or its path doesn't match. Test with `curl -i https://kronaut.example.com/oauth/bluesky/oauth-client-metadata.json` from a machine that isn't logged in to Access.
- **The tunnel is down:**
  - Run `docker compose logs cloudflared`. "Provided Tunnel token is not valid" means the token file is wrong: rewrite it as in step 3 and rerun `init-secrets.sh`.
  - Check that the route Service URLs are exactly `http://app:3000` and `http://media:3000`.
  - `cloudflared` waits for `app` to be healthy, so check `docker compose ps` first.
- **`migrate` fails:** run `docker compose logs migrate`.
  - `password authentication failed`: the secrets were regenerated after the database volume was created. The init script in `postgres-init/` creates the login roles only on the volume's first start. Restore the old `secrets/`, or, on a stack with no data yet, run `docker compose down -v` and start again.
  - A checksum or lock error is a real migration problem. Don't edit the schema by hand.
- **`permission denied` reading `/run/secrets/…`:**
  - The file's owner doesn't match the container user. Rerun `sh init-secrets.sh`. It sets `postgres_*` to uid 70 and everything else to uid 65532, all `0400`.
  - Rootless Docker and `userns-remap` shift uids, so the script's owners won't match there. Run the stack with rootful Docker, or chown the files to the remapped uids yourself.
  - On SELinux hosts, the bind-mounted files may also need a label: `chcon -t container_file_t ../../secrets/*`.
- **`bind source path does not exist` for a secret:** a file is missing from `secrets/`. Rerun `init-secrets.sh`; it prints what it created. `cloudflared_token` is the only file you add yourself.
