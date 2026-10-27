-- Kronaut v1 schema. PostgreSQL 17. Normative: migrations are tested against this file.
-- Applied by the migration role, which owns every object. The app connects as kronaut_app:
-- not the owner, so RLS applies. Every app transaction runs inside withTenant(), which does
--   select set_config('app.workspace_id', $ws, true), set_config('app.actor', $actor, true)
-- or, before a workspace is chosen, withActor(), which sets only app.actor. The CLI connects as
-- kronaut_operator. Global tables are default-deny; ADR-0048 lists every grant and entry point.
-- Phase 2+ tables (analytics, context_documents, automation_policies, oauth_clients) are additive and omitted.
-- The migrator runs this file in one transaction; apply it by hand with psql --single-transaction.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kronaut_app') THEN
    CREATE ROLE kronaut_app NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kronaut_operator') THEN
    CREATE ROLE kronaut_operator NOLOGIN;
  END IF;
END $$;

-- PG18 ships pg_catalog.uuidv7(), which shadows this one; drop ours after the upgrade.
CREATE FUNCTION uuidv7() RETURNS uuid LANGUAGE sql VOLATILE PARALLEL SAFE AS $$
  SELECT encode(set_bit(set_bit(
    overlay(uuid_send(gen_random_uuid())
            PLACING substring(int8send((extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3)
            FROM 1 FOR 6), 52, 1), 53, 1), 'hex')::uuid
$$;

CREATE DOMAIN iana_tz AS text CHECK (VALUE ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+)*$');
CREATE DOMAIN bcp47   AS text CHECK (VALUE ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$');
CREATE DOMAIN hash32  AS bytea CHECK (octet_length(VALUE) = 32);

-- Raises when unset or '' (pooled connection after a SET LOCAL), so a query outside withTenant() errors instead of returning nothing.
CREATE FUNCTION app_workspace_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.workspace_id')::uuid
$$;

CREATE FUNCTION app_actor() RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE a text := current_setting('app.actor', true);
BEGIN
  IF a IS NULL OR a !~ '^((user|grant|reviewer):[0-9a-f-]{36}|system|cli)$' THEN
    RAISE EXCEPTION 'app.actor not set or malformed' USING ERRCODE = 'KR006';
  END IF;
  RETURN a;
END $$;

CREATE FUNCTION app_actor_id(kind text) RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN split_part(app_actor(), ':', 1) = kind THEN split_part(app_actor(), ':', 2)::uuid END
$$;

CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE FUNCTION forbid_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION '% is immutable', TG_TABLE_NAME USING ERRCODE = 'KR005'; END $$;

CREATE TABLE instance_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  instance_id uuid NOT NULL,
  restore_epoch integer NOT NULL DEFAULT 0,
  publishing_paused boolean NOT NULL DEFAULT false,
  paused_reason text CHECK (paused_reason IN ('restore_quarantine','instance_id_mismatch','operator')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (publishing_paused = (paused_reason IS NOT NULL))
);

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  plan text NOT NULL DEFAULT 'self_host' CHECK (plan ~ '^[a-z0-9_]{1,40}$'),
  billing_customer_ref text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deletion_requested_at timestamptz
);

CREATE TABLE entitlement_overrides (
  organization_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  key text NOT NULL CHECK (key ~ '^[a-z0-9_]+(\.[a-z0-9_]+)*$'),
  value jsonb NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, key)
);

CREATE TABLE usage_counters (
  organization_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  metric text NOT NULL CHECK (metric ~ '^[a-z0-9_]+(\.[a-z0-9_]+)+$'),
  period_start date NOT NULL,
  count bigint NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (organization_id, metric, period_start)
);

CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL REFERENCES organizations ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,62}$'),
  timezone iana_tz NOT NULL,
  default_language bcp47 NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deletion_requested_at timestamptz
);
CREATE INDEX ix_ws_org ON workspaces (organization_id);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  email text,
  email_normalized text UNIQUE,
  display_name text,
  password_hash text,
  totp_secret_ciphertext bytea, totp_nonce bytea, totp_wrapped_dek bytea, totp_kek_version smallint,
  totp_last_step bigint,
  ui_locale text NOT NULL DEFAULT 'en' CONSTRAINT ck_users_ui_locale CHECK (ui_locale IN ('en','sk','cs')),
  display_timezone iana_tz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  erased_at timestamptz,
  CHECK ((erased_at IS NULL) = (email_normalized IS NOT NULL)),
  CHECK (num_nulls(totp_secret_ciphertext, totp_nonce, totp_wrapped_dek, totp_kek_version) IN (0,4))
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  token_hash hash32 NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  idle_expires_at timestamptz NOT NULL,
  reauthenticated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_sessions_user ON sessions (user_id);

CREATE TABLE security_events (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid,
  kind text NOT NULL CHECK (kind ~ '^[a-z_]+(\.[a-z_]+)+$'),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  ip_prefix inet,
  detail jsonb CHECK (octet_length(detail::text) <= 2048)
);
CREATE INDEX ix_secev_user ON security_events (user_id, occurred_at);
CREATE INDEX ix_secev_time ON security_events (occurred_at);

CREATE TABLE deletion_receipts (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  subject_kind text NOT NULL CHECK (subject_kind IN ('workspace','organization','user')),
  subject_id uuid NOT NULL,
  requested_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  counts jsonb NOT NULL
);

CREATE TABLE memberships (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users,
  role text NOT NULL CONSTRAINT ck_memberships_role
    CHECK (role IN ('owner','admin','editor','contributor','viewer','client')),
  can_approve boolean NOT NULL DEFAULT false,
  resource_scope text NOT NULL DEFAULT 'workspace' CHECK (resource_scope IN ('workspace','restricted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX ix_memberships_user ON memberships (user_id);

CREATE TABLE brands (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,62}$'),
  default_language bcp47,
  timezone iana_tz,
  website_url text CHECK (website_url ~ '^https://'),
  approved_domains text[] NOT NULL DEFAULT '{}',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  UNIQUE (workspace_id, slug)
);

CREATE TABLE locations (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  brand_id uuid NOT NULL,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  timezone iana_tz,
  default_language bcp47,
  address jsonb,
  landing_url text CHECK (landing_url ~ '^https://'),
  local_instructions text CHECK (length(local_instructions) <= 4000),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  UNIQUE (workspace_id, brand_id, id),
  UNIQUE (workspace_id, brand_id, name),
  FOREIGN KEY (workspace_id, brand_id) REFERENCES brands
);

-- Instance-scoped: tokens are bound to the app that issued them; Mastodon needs one row per instance.
CREATE TABLE provider_apps (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  provider text NOT NULL CHECK (provider ~ '^[a-z0-9_]{2,32}$'),
  instance_host text NOT NULL DEFAULT '',
  client_id text NOT NULL,
  client_secret_ciphertext bytea, client_secret_nonce bytea, client_secret_wrapped_dek bytea, kek_version smallint,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','misconfigured','disabled')),
  review_state text NOT NULL DEFAULT 'unknown'
    CHECK (review_state IN ('unknown','development','in_review','approved','limited')),
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, instance_host, client_id),
  CHECK (num_nulls(client_secret_ciphertext, client_secret_nonce, client_secret_wrapped_dek, kek_version) IN (0,4))
);

-- Bluesky signs client assertions with these keys (ADR-0050); only the operator writes them.
CREATE TABLE provider_app_keys (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  provider_app_id uuid NOT NULL REFERENCES provider_apps ON DELETE CASCADE,
  kid text NOT NULL CHECK (kid ~ '^[A-Za-z0-9_-]{8,64}$'),
  alg text NOT NULL CHECK (alg IN ('ES256')),
  public_jwk jsonb NOT NULL CHECK (jsonb_typeof(public_jwk) = 'object' AND NOT public_jwk ? 'd'),
  ciphertext bytea NOT NULL, nonce bytea NOT NULL, wrapped_dek bytea NOT NULL, kek_version smallint NOT NULL,
  aad_v smallint NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'next' CHECK (status IN ('next','active','retiring')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_app_id, kid)
);
CREATE UNIQUE INDEX ux_app_key_active ON provider_app_keys (provider_app_id) WHERE status = 'active';

CREATE TABLE provider_app_incidents (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  provider_app_id uuid NOT NULL REFERENCES provider_apps ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('app_credentials_invalid','app_suspended','tier_not_enrolled',
    'rate_limited_app','provider_outage')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  occurrences integer NOT NULL DEFAULT 1,
  notified_at timestamptz, resolved_at timestamptz, detail_code text
);
CREATE UNIQUE INDEX ux_app_incident_open ON provider_app_incidents (provider_app_id, kind) WHERE resolved_at IS NULL;

CREATE TABLE social_accounts (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  provider text NOT NULL CHECK (provider ~ '^[a-z0-9_]{2,32}$'),
  provider_app_id uuid NOT NULL REFERENCES provider_apps,
  provider_account_id text NOT NULL,
  account_kind text NOT NULL CHECK (account_kind ~ '^[a-z0-9_]{2,32}$'),
  handle text, display_name text NOT NULL, profile_url text,
  brand_id uuid, location_id uuid,
  status text NOT NULL DEFAULT 'active' CONSTRAINT ck_social_accounts_status
    CHECK (status IN ('active','needs_reauth','disabled','disconnected')),
  status_reason text, status_changed_at timestamptz NOT NULL DEFAULT now(),
  access_expires_at timestamptz, refresh_expires_at timestamptz,
  last_ok_at timestamptz, last_error_at timestamptz, last_error_code text,
  capabilities jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  UNIQUE (workspace_id, provider, provider_account_id),
  CHECK (location_id IS NULL OR brand_id IS NOT NULL),
  FOREIGN KEY (workspace_id, brand_id) REFERENCES brands,
  FOREIGN KEY (workspace_id, brand_id, location_id) REFERENCES locations (workspace_id, brand_id, id)
);
CREATE INDEX ix_acc_unassigned ON social_accounts (workspace_id) WHERE brand_id IS NULL;
CREATE INDEX ix_acc_app ON social_accounts (provider_app_id);

CREATE TABLE account_credentials (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  social_account_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('oauth','page_token','app_password','bot_token')),
  ciphertext bytea NOT NULL, nonce bytea NOT NULL, wrapped_dek bytea NOT NULL, kek_version smallint NOT NULL,
  aad_v smallint NOT NULL DEFAULT 1,
  version integer NOT NULL DEFAULT 1,
  granted_scopes text[] NOT NULL DEFAULT '{}',
  access_expires_at timestamptz, refresh_expires_at timestamptz,
  refresh_lease_until timestamptz, refresh_lease_owner text,
  client_key_id uuid REFERENCES provider_app_keys ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  UNIQUE (workspace_id, social_account_id, kind),
  CHECK ((refresh_lease_until IS NULL) = (refresh_lease_owner IS NULL)),
  FOREIGN KEY (workspace_id, social_account_id) REFERENCES social_accounts ON DELETE CASCADE
);
CREATE INDEX ix_cred_expiry ON account_credentials ((least(access_expires_at, refresh_expires_at)));
CREATE INDEX ix_cred_client_key ON account_credentials (client_key_id);

CREATE TABLE account_groups (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  description text,
  created_by uuid REFERENCES users,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  UNIQUE (workspace_id, name)
);

CREATE TABLE account_group_members (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  group_id uuid NOT NULL,
  social_account_id uuid NOT NULL,
  added_by uuid REFERENCES users,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, group_id, social_account_id),
  FOREIGN KEY (workspace_id, group_id) REFERENCES account_groups ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, social_account_id) REFERENCES social_accounts ON DELETE CASCADE
);
CREATE INDEX ix_agm_account ON account_group_members (workspace_id, social_account_id);

CREATE TABLE access_grants (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  kind text NOT NULL CHECK (kind IN ('api_key','oauth','internal_ai')),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  sponsor_user_id uuid NOT NULL REFERENCES users,
  oauth_client_id uuid,
  -- Allowlist, not denylist: a scope nobody reviewed cannot be stored. Never grantable: approvals:decide,
  -- channels:connect|disconnect|assign, groups:write, brands:write, review_links:create, members:manage,
  -- grants:manage, policy:write, webhooks:manage, settings:write, billing:manage, posts:unpublish.
  scopes text[] NOT NULL CONSTRAINT ck_access_grants_scopes CHECK (cardinality(scopes) > 0 AND scopes <@ ARRAY[
    'brands:read','channels:read','groups:read','posts:read','media:read','analytics:read','comments:read',
    'audit:read','posts:draft','posts:submit','posts:schedule','posts:cancel','media:write','comments:write',
    'ai:generate']::text[]),
  resource_scope text NOT NULL DEFAULT 'workspace' CHECK (resource_scope IN ('workspace','restricted')),
  rate_limit_per_min integer CHECK (rate_limit_per_min BETWEEN 1 AND 6000),
  expires_at timestamptz, revoked_at timestamptz, revoked_by uuid REFERENCES users, last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  CHECK ((kind = 'oauth') = (oauth_client_id IS NOT NULL))
);

CREATE TABLE grant_tokens (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  grant_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('key','access','refresh')),
  key_id text NOT NULL UNIQUE CHECK (key_id ~ '^[0-9a-z]{16,32}$'),
  token_hash hash32 NOT NULL UNIQUE,
  hash_key_version smallint NOT NULL,
  family_id uuid,
  expires_at timestamptz, used_at timestamptz, revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  CHECK ((kind = 'refresh') = (family_id IS NOT NULL)),
  CHECK (kind = 'key' OR expires_at IS NOT NULL),
  FOREIGN KEY (workspace_id, grant_id) REFERENCES access_grants ON DELETE CASCADE
);
CREATE INDEX ix_grant_tokens_grant ON grant_tokens (workspace_id, grant_id);

-- Rows apply only when the principal's resource_scope = 'restricted'; restricted with zero rows = nothing (fail-closed).
CREATE TABLE access_scopes (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  user_id uuid, grant_id uuid,
  brand_id uuid, location_id uuid, social_account_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  CHECK (num_nonnulls(user_id, grant_id) = 1),
  CHECK (num_nonnulls(brand_id, location_id, social_account_id) = 1),
  FOREIGN KEY (workspace_id, user_id) REFERENCES memberships ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, grant_id) REFERENCES access_grants ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, brand_id) REFERENCES brands ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, location_id) REFERENCES locations ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, social_account_id) REFERENCES social_accounts ON DELETE CASCADE
);
CREATE UNIQUE INDEX ux_scope_row ON access_scopes
  (workspace_id, coalesce(user_id, grant_id), coalesce(brand_id, location_id, social_account_id));

CREATE TABLE idempotency_keys (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  actor_key text NOT NULL,
  key text NOT NULL CHECK (length(key) BETWEEN 8 AND 128),
  request_hash hash32 NOT NULL,
  state text NOT NULL CHECK (state IN ('in_progress','completed')),
  response_status smallint, response_body jsonb, resource_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (workspace_id, actor_key, key)
);
CREATE INDEX ix_idem_exp ON idempotency_keys (expires_at);

CREATE TABLE campaigns (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  brand_id uuid,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  brief text CHECK (length(brief) <= 20000),
  starts_on date, ends_on date, color text, archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on),
  FOREIGN KEY (workspace_id, brand_id) REFERENCES brands
);

CREATE TABLE posts (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  brand_id uuid, location_id uuid, campaign_id uuid,
  title text CHECK (length(title) <= 200),
  origin text NOT NULL CHECK (origin IN ('ui','api','mcp','import','rss','recurrence','duplicate','cli')),
  created_by_user_id uuid REFERENCES users,
  created_by_grant_id uuid,
  schedule_mode text NOT NULL DEFAULT 'unscheduled'
    CHECK (schedule_mode IN ('unscheduled','asap','instant','local_per_destination')),
  schedule_local timestamp, schedule_tz iana_tz,
  version integer NOT NULL DEFAULT 1,
  agent_dirty boolean NOT NULL DEFAULT false,
  publish_summary text NOT NULL DEFAULT 'draft' CHECK (publish_summary IN ('draft','in_review','scheduled',
    'in_progress','needs_action','completed_all','completed_partial','completed_failed','canceled')),
  settle_seq integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  CHECK ((schedule_mode IN ('unscheduled','asap')) = (schedule_local IS NULL)),
  CHECK (schedule_mode <> 'instant' OR schedule_tz IS NOT NULL),
  CHECK (location_id IS NULL OR brand_id IS NOT NULL),
  FOREIGN KEY (workspace_id, brand_id) REFERENCES brands,
  FOREIGN KEY (workspace_id, brand_id, location_id) REFERENCES locations (workspace_id, brand_id, id),
  FOREIGN KEY (workspace_id, campaign_id) REFERENCES campaigns,
  FOREIGN KEY (workspace_id, created_by_grant_id) REFERENCES access_grants
);

CREATE TABLE post_variants (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  post_id uuid NOT NULL,
  is_default boolean NOT NULL,
  label text,
  content_language bcp47,
  forked_from_post_version integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  UNIQUE (workspace_id, post_id, id),
  CHECK (NOT is_default OR forked_from_post_version IS NULL),
  FOREIGN KEY (workspace_id, post_id) REFERENCES posts ON DELETE CASCADE
);
CREATE UNIQUE INDEX ux_variant_default ON post_variants (workspace_id, post_id) WHERE is_default;

-- doc is stored already canonical (ProseMirror fromJSON/toJSON + NFC + LF); the hash never re-normalises.
CREATE TABLE variant_items (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  post_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 99),
  role text NOT NULL CHECK (role IN ('main','thread','comment')),
  doc jsonb NOT NULL CHECK (octet_length(doc::text) <= 65536),
  doc_schema_v smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  CHECK ((position = 0) = (role = 'main')),
  CONSTRAINT ux_item_pos UNIQUE (workspace_id, variant_id, position) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (workspace_id, post_id, variant_id) REFERENCES post_variants (workspace_id, post_id, id) ON DELETE CASCADE
);

CREATE TABLE media_assets (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  kind text NOT NULL CHECK (kind IN ('image','video')),
  state text NOT NULL CHECK (state IN ('uploading','quarantined','processing','ready','rejected')),
  storage_key text NOT NULL UNIQUE CHECK (storage_key ~ '^[0-9a-f]{64}(\.[a-z0-9]{2,5})?$'),
  source_sha256 hash32,
  sha256 hash32,
  mime text, bytes bigint, width integer, height integer, duration_ms integer,
  original_name text CHECK (length(original_name) <= 255),
  alt_text text CHECK (length(alt_text) <= 1500),
  ai_generated boolean NOT NULL DEFAULT false,
  in_library boolean NOT NULL DEFAULT true,
  uploaded_by_user_id uuid, uploaded_by_grant_id uuid,
  original_purged_at timestamptz, deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  CHECK (state <> 'ready' OR num_nulls(sha256, mime, bytes) = 0)
);
CREATE INDEX ix_media_gc ON media_assets (deleted_at) WHERE deleted_at IS NOT NULL AND original_purged_at IS NULL;
CREATE INDEX ix_media_uploading ON media_assets (created_at) WHERE state = 'uploading';

CREATE TABLE media_renditions (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  media_asset_id uuid NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('thumb_256','thumb_768','publish')),
  transform_hash hash32 NOT NULL,
  storage_key text NOT NULL UNIQUE,
  sha256 hash32 NOT NULL, mime text NOT NULL, bytes bigint NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  UNIQUE (workspace_id, media_asset_id, transform_hash),
  FOREIGN KEY (workspace_id, media_asset_id) REFERENCES media_assets ON DELETE CASCADE
);
CREATE INDEX ix_rendition_exp ON media_renditions (expires_at) WHERE expires_at IS NOT NULL;

CREATE TABLE item_media (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  item_id uuid NOT NULL,
  media_asset_id uuid NOT NULL,
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 34),
  alt_text text CHECK (length(alt_text) <= 1500),
  transform jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  CONSTRAINT ux_item_media_pos UNIQUE (workspace_id, item_id, position) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (workspace_id, item_id) REFERENCES variant_items ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, media_asset_id) REFERENCES media_assets
);
CREATE INDEX ix_item_media_asset ON item_media (workspace_id, media_asset_id);

-- Immutable. created_by_* and agent_tainted are derived from app.actor by trigger, never from app input.
CREATE TABLE post_revisions (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  post_id uuid NOT NULL,
  post_version integer NOT NULL,
  snapshot jsonb NOT NULL, snapshot_v smallint NOT NULL,
  content_hash hash32 NOT NULL, content_hash_v smallint NOT NULL,
  reason text NOT NULL CHECK (reason IN ('checkpoint','submit','schedule','agent_edit','restore')),
  created_by_user_id uuid, created_by_grant_id uuid,
  agent_tainted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, post_id, post_version),
  CHECK (num_nonnulls(created_by_user_id, created_by_grant_id) <= 1),
  FOREIGN KEY (workspace_id, post_id) REFERENCES posts ON DELETE CASCADE
);

-- Per-destination hash of a revision; the FK target that ties a destination's content_hash to its revision.
CREATE TABLE revision_destinations (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  post_id uuid NOT NULL,
  post_version integer NOT NULL,
  social_account_id uuid NOT NULL,
  publish_type text NOT NULL,
  variant_id uuid NOT NULL,
  content_hash hash32 NOT NULL,
  agent_authored boolean NOT NULL DEFAULT false,
  PRIMARY KEY (workspace_id, post_id, post_version, social_account_id, publish_type),
  UNIQUE (workspace_id, post_id, post_version, social_account_id, publish_type, content_hash, agent_authored),
  FOREIGN KEY (workspace_id, post_id, post_version) REFERENCES post_revisions ON DELETE CASCADE
);

CREATE TABLE approval_policies (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  brand_id uuid,
  mode text NOT NULL CHECK (mode IN ('none','required')),
  stages smallint NOT NULL DEFAULT 1 CHECK (stages = 1),
  required_approvals smallint NOT NULL DEFAULT 1 CHECK (required_approvals BETWEEN 1 AND 5),
  reschedule_tolerance_min integer NOT NULL DEFAULT 0 CHECK (reschedule_tolerance_min BETWEEN 0 AND 525600),
  allow_self_approval boolean NOT NULL DEFAULT false,
  allow_reviewer_links boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  CONSTRAINT ux_policy_scope UNIQUE NULLS NOT DISTINCT (workspace_id, brand_id),
  FOREIGN KEY (workspace_id, brand_id) REFERENCES brands ON DELETE CASCADE
);

CREATE TABLE approval_requests (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  post_id uuid NOT NULL,
  post_version integer NOT NULL,
  content_hash hash32 NOT NULL, content_hash_v smallint NOT NULL,
  policy_id uuid, policy_version integer, policy_snapshot jsonb NOT NULL,
  required_approvals smallint NOT NULL CHECK (required_approvals BETWEEN 1 AND 5),
  state text NOT NULL DEFAULT 'open'
    CHECK (state IN ('open','approved','rejected','voided','withdrawn','revoked')),
  void_reason text CHECK (void_reason IN ('content_changed','destinations_changed','schedule_changed','policy_changed')),
  requested_by_user_id uuid REFERENCES users, requested_by_grant_id uuid,
  note text CHECK (length(note) <= 2000),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  CHECK (num_nonnulls(requested_by_user_id, requested_by_grant_id) = 1),
  CHECK ((state = 'voided') = (void_reason IS NOT NULL)),
  CHECK ((state = 'open') = (resolved_at IS NULL)),
  FOREIGN KEY (workspace_id, post_id, post_version) REFERENCES post_revisions ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, requested_by_grant_id) REFERENCES access_grants
);
CREATE UNIQUE INDEX ux_approval_open ON approval_requests (workspace_id, post_id) WHERE state = 'open';
CREATE INDEX ix_approval_post ON approval_requests (workspace_id, post_id, post_version);

-- What the approver was shown, per destination. Schedule is bound as wall time + tz, so a tzdata update never voids it.
CREATE TABLE approval_request_destinations (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  request_id uuid NOT NULL,
  destination_id uuid NOT NULL,
  content_hash hash32 NOT NULL,
  schedule_bound boolean NOT NULL,
  shown_local timestamp, shown_tz iana_tz, tolerance_min integer,
  PRIMARY KEY (workspace_id, request_id, destination_id),
  UNIQUE (workspace_id, request_id, destination_id, content_hash, schedule_bound),
  UNIQUE (workspace_id, request_id, destination_id, shown_local, shown_tz, tolerance_min),
  CHECK (schedule_bound = (num_nulls(shown_local, shown_tz, tolerance_min) = 0)),
  CHECK (num_nulls(shown_local, shown_tz, tolerance_min) IN (0,3)),
  CHECK (tolerance_min IS NULL OR tolerance_min BETWEEN 0 AND 525600),
  FOREIGN KEY (workspace_id, request_id) REFERENCES approval_requests ON DELETE CASCADE
);

CREATE TABLE review_links (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  token_hash hash32 NOT NULL UNIQUE,
  invitee_email text, invitee_name text,
  can_comment boolean NOT NULL DEFAULT true,
  can_decide boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz, revoked_by uuid REFERENCES users,
  created_by uuid NOT NULL REFERENCES users,
  otp_failures smallint NOT NULL DEFAULT 0, otp_locked_until timestamptz,
  last_used_at timestamptz, use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  CHECK (expires_at <= created_at + interval '90 days'),
  CHECK (NOT can_decide OR invitee_email IS NOT NULL)
);

-- Explicit post set; no date-range or campaign scope that silently grows.
CREATE TABLE review_link_posts (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  review_link_id uuid NOT NULL,
  post_id uuid NOT NULL,
  PRIMARY KEY (workspace_id, review_link_id, post_id),
  FOREIGN KEY (workspace_id, review_link_id) REFERENCES review_links ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, post_id) REFERENCES posts ON DELETE CASCADE
);
CREATE INDEX ix_rlp_post ON review_link_posts (workspace_id, post_id);

CREATE TABLE comments (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  post_id uuid NOT NULL,
  parent_id uuid,
  anchor text NOT NULL CHECK (anchor IN ('post','variant','item','media','destination')),
  variant_id uuid, item_id uuid, item_media_id uuid, destination_id uuid,
  post_version integer NOT NULL,
  quote jsonb,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  author_user_id uuid REFERENCES users, author_grant_id uuid, review_link_id uuid,
  author_name text, author_email text,
  resolved_at timestamptz, resolved_by uuid REFERENCES users, edited_at timestamptz, deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  CHECK (num_nonnulls(author_user_id, author_grant_id, review_link_id) = 1),
  CHECK (num_nonnulls(variant_id, item_id, item_media_id, destination_id) <= 1),
  FOREIGN KEY (workspace_id, post_id) REFERENCES posts ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, parent_id) REFERENCES comments ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, item_id) REFERENCES variant_items ON DELETE SET NULL (item_id),
  FOREIGN KEY (workspace_id, author_grant_id) REFERENCES access_grants,
  FOREIGN KEY (workspace_id, review_link_id) REFERENCES review_links
);
CREATE INDEX ix_comments_post ON comments (workspace_id, post_id);

CREATE TABLE approval_decisions (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  request_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approve','reject','request_changes')),
  approver_kind text NOT NULL CHECK (approver_kind IN ('user','reviewer')),
  user_id uuid REFERENCES users,
  review_link_id uuid,
  reviewer_email text, otp_verified_at timestamptz,
  session_reauth_at timestamptz,
  comment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  CHECK (approver_kind <> 'user' OR (user_id IS NOT NULL AND review_link_id IS NULL AND session_reauth_at IS NOT NULL)),
  CHECK (approver_kind <> 'reviewer' OR (review_link_id IS NOT NULL AND user_id IS NULL
         AND reviewer_email IS NOT NULL AND otp_verified_at IS NOT NULL)),
  UNIQUE (workspace_id, request_id, user_id),
  FOREIGN KEY (workspace_id, request_id) REFERENCES approval_requests ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, review_link_id) REFERENCES review_links,
  FOREIGN KEY (workspace_id, comment_id) REFERENCES comments ON DELETE SET NULL (comment_id)
);
-- One person, one vote: two links sent to the same address must not satisfy required_approvals = 2.
CREATE UNIQUE INDEX ux_decision_reviewer ON approval_decisions (workspace_id, request_id, lower(reviewer_email))
  WHERE approver_kind = 'reviewer';

CREATE TABLE destination_transitions (
  from_state text NOT NULL, to_state text NOT NULL, PRIMARY KEY (from_state, to_state)
);
INSERT INTO destination_transitions VALUES
  ('draft','scheduled'),('draft','canceled'),
  ('scheduled','draft'),('scheduled','publishing'),('scheduled','awaiting_manual'),
  ('scheduled','blocked'),('scheduled','failed'),('scheduled','canceled'),
  ('retry_wait','draft'),('retry_wait','publishing'),('retry_wait','blocked'),
  ('retry_wait','failed'),('retry_wait','canceled'),
  ('publishing','published'),('publishing','retry_wait'),('publishing','verifying'),
  ('publishing','unconfirmed'),('publishing','failed'),('publishing','blocked'),('publishing','canceled'),
  ('verifying','published'),('verifying','retry_wait'),('verifying','unconfirmed'),('verifying','failed'),
  ('unconfirmed','published'),('unconfirmed','scheduled'),('unconfirmed','canceled'),
  ('blocked','scheduled'),('blocked','draft'),('blocked','failed'),('blocked','canceled'),
  ('failed','scheduled'),('failed','draft'),('failed','canceled'),
  ('awaiting_manual','published'),('awaiting_manual','canceled'),
  ('canceled','draft');

CREATE TABLE destination_state_reasons (
  state text NOT NULL, code text NOT NULL CHECK (code ~ '^[a-z_]+$'), PRIMARY KEY (state, code)
);
INSERT INTO destination_state_reasons VALUES
  ('draft','approval_voided'),('draft','unscheduled'),('draft','rejected'),
  ('retry_wait','transient_error'),('retry_wait','rate_limited'),('retry_wait','interrupted_safe'),
  ('retry_wait','provider_processing'),('retry_wait','absent_verified'),('retry_wait','auth_refreshed'),
  ('verifying','ambiguous_response'),('verifying','interrupted_after_send'),('verifying','provider_processing'),
  ('verifying','late_finalize'),
  ('unconfirmed','ambiguous_response'),('unconfirmed','interrupted_after_send'),
  ('unconfirmed','verify_inconclusive'),('unconfirmed','verify_window_elapsed'),
  ('failed','permanent_error'),('failed','attempts_exhausted'),('failed','late_window_exceeded'),
  ('failed','media_processing_timeout'),('failed','rate_limit_beyond_deadline'),('failed','async_give_up'),
  ('blocked','account_needs_reauth'),('blocked','account_disconnected'),('blocked','account_disabled'),
  ('blocked','app_credentials_invalid'),
  ('blocked','policy_denied'),('blocked','entitlement_exceeded'),('blocked','refresh_token_lost'),
  ('blocked','restore_quarantine'),('blocked','account_out_of_scope'),
  ('canceled','user_canceled'),('canceled','workspace_deleted'),('canceled','account_purged'),
  ('canceled','skipped_manual');

CREATE TABLE post_destinations (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  post_id uuid NOT NULL,
  variant_id uuid,
  social_account_id uuid NOT NULL,
  provider text NOT NULL,
  publish_type text NOT NULL CHECK (publish_type ~ '^[a-z0-9_]{1,40}$'),
  delivery_mode text NOT NULL DEFAULT 'auto' CHECK (delivery_mode IN ('auto','reminder')),
  settings jsonb NOT NULL DEFAULT '{}', settings_v smallint NOT NULL DEFAULT 1,
  selection_source text NOT NULL CHECK (selection_source IN ('manual','group','agent','duplicate','import')),
  source_group_id uuid,
  state text NOT NULL DEFAULT 'draft' CONSTRAINT ck_post_destinations_state CHECK (state IN ('draft','scheduled',
    'publishing','retry_wait','verifying','published','unconfirmed','failed','blocked','awaiting_manual','canceled')),
  state_reason text,
  version integer NOT NULL DEFAULT 1,
  scheduled_local timestamp, scheduled_tz iana_tz, scheduled_at timestamptz,
  tz_resolution text CHECK (tz_resolution IN ('exact','gap_forward','overlap_earlier')), tzdb_version text,
  run_at timestamptz, deadline_at timestamptz,
  scheduled_by_user_id uuid, scheduled_by_grant_id uuid,
  frozen_at timestamptz, frozen_post_version integer, content_hash hash32, content_hash_v smallint,
  agent_content boolean NOT NULL DEFAULT false,
  account_label text NOT NULL,
  brand_id_at_freeze uuid, location_id_at_freeze uuid,
  approval_required boolean NOT NULL DEFAULT false,
  approval_request_id uuid,
  approval_schedule_bound boolean,
  approved_scheduled_local timestamp, approved_scheduled_tz iana_tz, approved_tolerance_min integer,
  preflight jsonb, preflight_acked_codes text[] NOT NULL DEFAULT '{}',
  attempt_count smallint NOT NULL DEFAULT 0,
  lease_until timestamptz, claimed_attempt_id uuid, cancel_requested_at timestamptz,
  provider_state jsonb NOT NULL DEFAULT '{}', provider_state_v smallint NOT NULL DEFAULT 1,
  remote_id text, remote_url text, published_at timestamptz,
  resolution text CHECK (resolution IN ('api','verified','manual')), verified_at timestamptz,
  last_error_code text, last_error_message text CHECK (length(last_error_message) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  UNIQUE (workspace_id, post_id, social_account_id, publish_type),
  FOREIGN KEY (workspace_id, post_id) REFERENCES posts ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, social_account_id) REFERENCES social_accounts,
  FOREIGN KEY (workspace_id, post_id, variant_id) REFERENCES post_variants (workspace_id, post_id, id)
    ON DELETE SET NULL (variant_id),
  FOREIGN KEY (workspace_id, source_group_id) REFERENCES account_groups ON DELETE SET NULL (source_group_id),
  CONSTRAINT fk_dest_revision FOREIGN KEY
    (workspace_id, post_id, frozen_post_version, social_account_id, publish_type, content_hash, agent_content)
    REFERENCES revision_destinations
    (workspace_id, post_id, post_version, social_account_id, publish_type, content_hash, agent_authored),
  CONSTRAINT fk_dest_reason FOREIGN KEY (state, state_reason) REFERENCES destination_state_reasons (state, code),
  CONSTRAINT ck_dest_frozen_shape CHECK (num_nulls(frozen_at, frozen_post_version, content_hash, content_hash_v) IN (0,4)),
  CONSTRAINT ck_dest_frozen CHECK (state IN ('draft','canceled') OR frozen_at IS NOT NULL),
  CONSTRAINT ck_dest_draft_variant CHECK (frozen_at IS NOT NULL OR variant_id IS NOT NULL OR state = 'canceled'),
  CONSTRAINT ck_dest_approval_frozen CHECK (approval_request_id IS NULL OR frozen_at IS NOT NULL),
  CONSTRAINT ck_dest_approval_required CHECK (NOT approval_required OR state IN ('draft','canceled')
    OR approval_request_id IS NOT NULL),
  CONSTRAINT ck_dest_agent_needs_approval CHECK (NOT agent_content OR approval_required),
  -- coalesce: a NULL CHECK result passes, so every comparison here must be forced to false.
  CONSTRAINT ck_dest_schedule_binding CHECK (approval_request_id IS NULL OR coalesce(
    (approval_schedule_bound IS FALSE
      AND num_nonnulls(approved_scheduled_local, approved_scheduled_tz, approved_tolerance_min) = 0)
    OR (approval_schedule_bound IS TRUE
      AND scheduled_tz = approved_scheduled_tz
      AND abs(extract(epoch FROM scheduled_local - approved_scheduled_local)) <= approved_tolerance_min * 60),
    false)),
  CONSTRAINT ck_dest_sched_shape CHECK (num_nulls(scheduled_local, scheduled_tz, scheduled_at) IN (0,3)),
  CONSTRAINT ck_dest_sched_required CHECK (state NOT IN ('scheduled','retry_wait','publishing','verifying',
    'awaiting_manual') OR (scheduled_at IS NOT NULL AND deadline_at IS NOT NULL)),
  CONSTRAINT ck_dest_run_at CHECK (state NOT IN ('scheduled','retry_wait') OR run_at IS NOT NULL),
  CONSTRAINT ck_dest_scheduled_by CHECK (num_nonnulls(scheduled_by_user_id, scheduled_by_grant_id) <= 1
    AND (state NOT IN ('scheduled','retry_wait','publishing','verifying','awaiting_manual')
      OR num_nonnulls(scheduled_by_user_id, scheduled_by_grant_id) = 1)),
  CONSTRAINT ck_dest_lease CHECK ((state = 'publishing') = (lease_until IS NOT NULL AND claimed_attempt_id IS NOT NULL)),
  CONSTRAINT ck_dest_published CHECK (state <> 'published' OR (published_at IS NOT NULL AND resolution IS NOT NULL)),
  CONSTRAINT ck_dest_reason_required CHECK (state NOT IN ('blocked','failed','unconfirmed','verifying')
    OR state_reason IS NOT NULL),
  CONSTRAINT ck_dest_mode CHECK ((state <> 'awaiting_manual' OR delivery_mode = 'reminder')
    AND (state NOT IN ('publishing','verifying') OR delivery_mode = 'auto')),
  CONSTRAINT ck_dest_group CHECK (selection_source = 'group' OR source_group_id IS NULL),
  CONSTRAINT ck_dest_tolerance_range CHECK (
    approved_tolerance_min IS NULL OR approved_tolerance_min BETWEEN 0 AND 525600)
);
CREATE INDEX ix_dest_due ON post_destinations (run_at) WHERE state IN ('scheduled','retry_wait');
CREATE INDEX ix_dest_lease ON post_destinations (lease_until) WHERE state = 'publishing';
CREATE UNIQUE INDEX ux_dest_inflight ON post_destinations (workspace_id, social_account_id) WHERE state = 'publishing';
CREATE INDEX ix_dest_calendar ON post_destinations (workspace_id, scheduled_at);
CREATE INDEX ix_dest_account ON post_destinations (workspace_id, social_account_id);
CREATE INDEX ix_dest_attention ON post_destinations (workspace_id, state)
  WHERE state IN ('unconfirmed','failed','blocked','awaiting_manual');
CREATE INDEX ix_dest_verifying ON post_destinations (updated_at) WHERE state = 'verifying';

-- Circular with post_destinations, hence added after both exist.
ALTER TABLE approval_request_destinations ADD CONSTRAINT fk_ard_destination
  FOREIGN KEY (workspace_id, destination_id) REFERENCES post_destinations ON DELETE CASCADE;
CREATE INDEX ix_ard_destination ON approval_request_destinations (workspace_id, destination_id);
ALTER TABLE post_destinations ADD CONSTRAINT fk_dest_approval_hash
  FOREIGN KEY (workspace_id, approval_request_id, id, content_hash, approval_schedule_bound)
  REFERENCES approval_request_destinations (workspace_id, request_id, destination_id, content_hash, schedule_bound);
ALTER TABLE post_destinations ADD CONSTRAINT fk_dest_approval_schedule
  FOREIGN KEY (workspace_id, approval_request_id, id, approved_scheduled_local, approved_scheduled_tz, approved_tolerance_min)
  REFERENCES approval_request_destinations (workspace_id, request_id, destination_id, shown_local, shown_tz, tolerance_min);

CREATE TABLE destination_media (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  destination_id uuid NOT NULL,
  media_asset_id uuid NOT NULL,
  PRIMARY KEY (workspace_id, destination_id, media_asset_id),
  FOREIGN KEY (workspace_id, destination_id) REFERENCES post_destinations ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, media_asset_id) REFERENCES media_assets
);
CREATE INDEX ix_dm_asset ON destination_media (workspace_id, media_asset_id);

CREATE TABLE destination_items (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  destination_id uuid NOT NULL,
  position smallint NOT NULL,
  role text NOT NULL CHECK (role IN ('main','thread','comment')),
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending','sending','confirmed','unconfirmed','failed','skipped')),
  rendered_text text, rendered_sha256 hash32,
  send_started_at timestamptz, confirmed_at timestamptz,
  remote_id text, remote_url text, reply_to_remote_id text,
  provider_state jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (workspace_id, destination_id, position),
  CHECK (state <> 'confirmed' OR remote_id IS NOT NULL),
  CHECK (state NOT IN ('sending','confirmed','unconfirmed') OR send_started_at IS NOT NULL),
  FOREIGN KEY (workspace_id, destination_id) REFERENCES post_destinations ON DELETE CASCADE
);

CREATE TABLE publish_attempts (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  destination_id uuid NOT NULL,
  attempt_no smallint NOT NULL,
  kind text NOT NULL CHECK (kind IN ('publish','verify')),
  worker_id text NOT NULL,
  post_version integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  public_send_at timestamptz,
  finished_at timestamptz,
  outcome text CHECK (outcome IN ('ok','retry_not_sent','rate_limited','unconfirmed','interrupted','permanent',
    'auth_expired','auth_revoked','app_config','canceled','duplicate','verify_found','verify_absent',
    'verify_inconclusive')),
  counted boolean NOT NULL DEFAULT true,
  item_position smallint, http_status smallint, provider_request_id text, error_code text,
  error_message text CHECK (length(error_message) <= 2000), retry_after timestamptz,
  -- A fenced-out finalize still records what the provider returned; reconcile promotes it.
  remote_id text, remote_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  UNIQUE (workspace_id, destination_id, attempt_no),
  CHECK ((outcome IS NULL) = (finished_at IS NULL)),
  FOREIGN KEY (workspace_id, destination_id) REFERENCES post_destinations ON DELETE CASCADE
);
CREATE UNIQUE INDEX ux_attempt_open ON publish_attempts (workspace_id, destination_id) WHERE finished_at IS NULL;

CREATE TABLE audit_events (
  workspace_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT uuidv7(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_kind text NOT NULL CHECK (actor_kind IN ('user','grant','reviewer','system','cli')),
  actor_id uuid,
  grant_kind text CHECK (grant_kind IN ('api_key','oauth','internal_ai')),
  sponsor_user_id uuid,
  on_behalf_of_user_id uuid,
  surface text NOT NULL CHECK (surface IN ('ui','api','mcp','cli','worker','public_link')),
  action text NOT NULL CHECK (action ~ '^[a-z_]+(\.[a-z_]+)+$'),
  tool text,
  resource_kind text, resource_id uuid,
  post_id uuid, post_version integer, brand_id uuid, location_id uuid, account_group_id uuid,
  social_account_ids uuid[],
  approval_request_id uuid,
  decision text CHECK (decision IN ('allow','deny','require_approval')),
  policy_version integer, policy_reason text,
  outcome text NOT NULL CHECK (outcome IN ('ok','denied','error')),
  error_code text,
  args_summary jsonb CHECK (octet_length(args_summary::text) <= 4096),
  correlation_id uuid NOT NULL, request_id text, idempotency_key text,
  -- PII; nulled after 90 days and excluded from seal hashes so nulling never breaks a seal.
  ip_prefix inet, ua_hash bytea,
  PRIMARY KEY (workspace_id, occurred_at, id),
  CHECK ((actor_kind IN ('system','cli')) = (actor_id IS NULL)),
  CHECK ((actor_kind = 'grant') = (grant_kind IS NOT NULL AND sponsor_user_id IS NOT NULL))
) PARTITION BY RANGE (occurred_at);
-- The default partition must stay empty: maintain_audit_partitions creates month partitions two months ahead.
CREATE TABLE audit_events_default PARTITION OF audit_events DEFAULT;
CREATE INDEX ix_audit_post ON audit_events (workspace_id, post_id, occurred_at) WHERE post_id IS NOT NULL;
CREATE INDEX ix_audit_corr ON audit_events (correlation_id);
CREATE INDEX ix_audit_actor ON audit_events (workspace_id, actor_id, occurred_at) WHERE actor_id IS NOT NULL;
CREATE INDEX ix_audit_pii ON audit_events (occurred_at) WHERE ip_prefix IS NOT NULL OR ua_hash IS NOT NULL;

-- Written by the Phase 2 seal job; created now so the row shape and hash version are fixed.
CREATE TABLE audit_seals (
  workspace_id uuid NOT NULL,
  month date NOT NULL,
  seq integer NOT NULL,
  from_id uuid NOT NULL, to_id uuid NOT NULL, row_count integer NOT NULL,
  batch_hash hash32 NOT NULL, prev_seal_hash hash32, hash_v smallint NOT NULL,
  sealed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, month, seq)
);

CREATE TABLE channel_incidents (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  social_account_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('auth_revoked','auth_expiring','auth_expired','permission_missing',
    'refresh_token_lost','rate_limited','provider_errors')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  occurrences integer NOT NULL DEFAULT 1,
  notified_at timestamptz, reminded_at timestamptz, resolved_at timestamptz, detail_code text,
  PRIMARY KEY (workspace_id, id),
  FOREIGN KEY (workspace_id, social_account_id) REFERENCES social_accounts ON DELETE CASCADE
);
CREATE UNIQUE INDEX ux_incident_open ON channel_incidents (workspace_id, social_account_id, kind) WHERE resolved_at IS NULL;

-- Logged on purpose: 24 h Retry-After and daily quotas must survive a restart. account: keys use the
-- provider's account id, not ours, so the same real account connected in two workspaces shares one bucket.
CREATE TABLE rate_buckets (
  key text PRIMARY KEY CHECK (key ~ '^(app|account|endpoint):'),
  kind text NOT NULL CHECK (kind IN ('token_bucket','window_quota')),
  capacity numeric NOT NULL, tokens numeric NOT NULL,
  refill_per_sec numeric, window_start timestamptz, window_secs integer, blocked_until timestamptz,
  provider_remaining integer, provider_reset_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Nothing whose loss could duplicate a side effect or bypass security may live here.
CREATE UNLOGGED TABLE ephemeral_kv (
  key text PRIMARY KEY CHECK (key ~ '^(oauth|upload|cache):'),
  value jsonb NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX ix_kv_exp ON ephemeral_kv (expires_at);

CREATE TABLE inbound_events (
  source text NOT NULL, external_id text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz,
  PRIMARY KEY (source, external_id)
);
CREATE INDEX ix_inbound_received ON inbound_events (received_at);

CREATE TABLE webhook_endpoints (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  url text NOT NULL CHECK (url ~ '^https://'),
  description text,
  events text[] NOT NULL CONSTRAINT ck_webhook_endpoints_events CHECK (cardinality(events) > 0 AND events <@ ARRAY[
    'destination.published','destination.failed','destination.unconfirmed','destination.blocked',
    'destination.awaiting_manual','post.completed','post.approval_requested','post.approved','post.rejected',
    'post.approval_voided','channel.needs_reauth','channel.reconnected','channel.expiring',
    'provider_app.misconfigured','webhook.test']::text[]),
  secret_ciphertext bytea NOT NULL, secret_nonce bytea NOT NULL, secret_wrapped_dek bytea NOT NULL,
  kek_version smallint NOT NULL,
  previous_secret_ciphertext bytea, previous_secret_nonce bytea, previous_secret_wrapped_dek bytea,
  previous_secret_expires_at timestamptz,
  enabled boolean NOT NULL DEFAULT true, disabled_reason text,
  consecutive_failures integer NOT NULL DEFAULT 0, failing_since timestamptz,
  created_by_user_id uuid REFERENCES users,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id)
);

CREATE TABLE webhook_events (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  type text NOT NULL,
  dedupe_key text NOT NULL,
  subject_id uuid,
  sequence integer,
  payload jsonb NOT NULL CHECK (octet_length(payload::text) <= 16384),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  UNIQUE (workspace_id, dedupe_key)
);

CREATE TABLE webhook_deliveries (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  endpoint_id uuid NOT NULL,
  event_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','delivering','delivered','retry_wait','dead')),
  attempt_count smallint NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_http_status smallint, last_error text CHECK (length(last_error) <= 1024),
  response_snippet text CHECK (length(response_snippet) <= 1024),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  UNIQUE (workspace_id, endpoint_id, event_id),
  FOREIGN KEY (workspace_id, endpoint_id) REFERENCES webhook_endpoints ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, event_id) REFERENCES webhook_events ON DELETE CASCADE
);
CREATE INDEX ix_whd_due ON webhook_deliveries (next_attempt_at) WHERE state IN ('pending','retry_wait');
CREATE INDEX ix_whd_event ON webhook_deliveries (workspace_id, event_id);

CREATE TABLE notifications (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES users,
  kind text NOT NULL CHECK (kind ~ '^[a-z_]+(\.[a-z_]+)+$'),
  incident_id uuid, post_id uuid, destination_id uuid,
  payload jsonb NOT NULL,
  dedupe_key text NOT NULL,
  read_at timestamptz, emailed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  UNIQUE (workspace_id, user_id, dedupe_key)
);

CREATE TABLE worker_heartbeats (
  worker_id text PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('all','api','worker','media')),
  started_at timestamptz NOT NULL, seen_at timestamptz NOT NULL, app_version text NOT NULL
);

CREATE TABLE cron_runs (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  task text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
  outcome text CHECK (outcome IN ('ok','error')), detail text
);
CREATE INDEX ix_cron_task ON cron_runs (task, started_at DESC);

CREATE FUNCTION trg_dest_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE req_state text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'draft' OR NEW.approval_request_id IS NOT NULL OR NEW.version <> 1 THEN
      RAISE EXCEPTION 'destinations are inserted as unbound drafts at version 1' USING ERRCODE = 'KR001';
    END IF;
    IF app_actor() LIKE 'grant:%' THEN
      UPDATE public.posts SET agent_dirty = true WHERE workspace_id = NEW.workspace_id AND id = NEW.post_id;
    END IF;
    RETURN NEW;
  END IF;

  IF (NEW.workspace_id, NEW.id, NEW.post_id, NEW.social_account_id, NEW.provider)
     IS DISTINCT FROM (OLD.workspace_id, OLD.id, OLD.post_id, OLD.social_account_id, OLD.provider) THEN
    RAISE EXCEPTION 'destination identity is immutable; swap = new row' USING ERRCODE = 'KR005';
  END IF;

  IF NEW.state IS DISTINCT FROM OLD.state THEN
    IF NOT EXISTS (SELECT 1 FROM public.destination_transitions WHERE from_state = OLD.state AND to_state = NEW.state) THEN
      RAISE EXCEPTION 'illegal destination transition % -> %', OLD.state, NEW.state USING ERRCODE = 'KR001';
    END IF;
    IF NEW.version <> OLD.version + 1 THEN
      RAISE EXCEPTION 'state change requires version + 1' USING ERRCODE = 'KR002';
    END IF;
    IF NEW.state = 'scheduled' AND app_actor() LIKE 'grant:%' AND NEW.approval_request_id IS NULL THEN
      RAISE EXCEPTION 'a grant may only schedule an approved destination' USING ERRCODE = 'KR006';
    END IF;
  ELSIF NEW.version NOT IN (OLD.version, OLD.version + 1) THEN
    RAISE EXCEPTION 'version may only advance by 1' USING ERRCODE = 'KR002';
  END IF;

  IF OLD.state = 'published' AND (NEW.frozen_post_version, NEW.content_hash, NEW.settings, NEW.scheduled_at,
       NEW.approval_request_id, NEW.remote_id) IS DISTINCT FROM (OLD.frozen_post_version, OLD.content_hash,
       OLD.settings, OLD.scheduled_at, OLD.approval_request_id, OLD.remote_id) THEN
    RAISE EXCEPTION 'published destinations are immutable' USING ERRCODE = 'KR005';
  END IF;

  -- variant_id -> NULL is allowed: that is the ON DELETE SET NULL action, and the worker reads the snapshot anyway.
  IF OLD.frozen_post_version IS NOT NULL
     AND NEW.frozen_post_version IS NOT DISTINCT FROM OLD.frozen_post_version
     AND (NEW.settings, NEW.publish_type, NEW.delivery_mode) IS DISTINCT FROM (OLD.settings, OLD.publish_type, OLD.delivery_mode)
  THEN
    RAISE EXCEPTION 'frozen destination edited without re-freeze' USING ERRCODE = 'KR003';
  END IF;
  IF OLD.frozen_post_version IS NOT NULL AND NEW.frozen_post_version IS NOT DISTINCT FROM OLD.frozen_post_version
     AND NEW.variant_id IS NOT NULL AND NEW.variant_id IS DISTINCT FROM OLD.variant_id THEN
    RAISE EXCEPTION 'frozen destination edited without re-freeze' USING ERRCODE = 'KR003';
  END IF;

  IF NEW.approval_request_id IS NOT NULL AND NEW.approval_request_id IS DISTINCT FROM OLD.approval_request_id THEN
    SELECT state INTO req_state FROM public.approval_requests
     WHERE workspace_id = NEW.workspace_id AND id = NEW.approval_request_id;
    IF req_state IS DISTINCT FROM 'approved' THEN
      RAISE EXCEPTION 'approval request % is %, not approved', NEW.approval_request_id, coalesce(req_state, 'missing')
        USING ERRCODE = 'KR004';
    END IF;
  END IF;

  IF app_actor() LIKE 'grant:%' AND (NEW.settings, NEW.variant_id, NEW.publish_type)
     IS DISTINCT FROM (OLD.settings, OLD.variant_id, OLD.publish_type) THEN
    UPDATE public.posts SET agent_dirty = true WHERE workspace_id = NEW.workspace_id AND id = NEW.post_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_dest_guard BEFORE INSERT OR UPDATE ON post_destinations
  FOR EACH ROW EXECUTE FUNCTION trg_dest_guard();

-- The claim re-runs authorize() as this principal (ADR-0042: tightening applies at claim). It is derived from
-- app.actor, never from app input, and only a user or grant that schedules or reschedules sets it.
CREATE FUNCTION trg_dest_scheduled_by() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.state IN ('draft','canceled') THEN
    NEW.scheduled_by_user_id := NULL;
    NEW.scheduled_by_grant_id := NULL;
  ELSIF NEW.state = 'scheduled' AND app_actor() ~ '^(user|grant):'
        AND (OLD.state <> 'scheduled' OR (NEW.scheduled_at, NEW.frozen_post_version)
             IS DISTINCT FROM (OLD.scheduled_at, OLD.frozen_post_version)) THEN
    NEW.scheduled_by_user_id := app_actor_id('user');
    NEW.scheduled_by_grant_id := app_actor_id('grant');
  ELSE
    NEW.scheduled_by_user_id := OLD.scheduled_by_user_id;
    NEW.scheduled_by_grant_id := OLD.scheduled_by_grant_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_dest_scheduled_by BEFORE INSERT OR UPDATE ON post_destinations
  FOR EACH ROW EXECUTE FUNCTION trg_dest_scheduled_by();

-- The post row is locked before the siblings are counted: two destinations settling in concurrent
-- transactions would otherwise each count the other's old state and leave a stale summary.
CREATE FUNCTION trg_publish_summary() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  r record := coalesce(NEW, OLD);
  cur text; nxt text;
  n_any integer; n_live integer; n_draft integer; n_sched integer; n_active integer; n_action integer;
  n_pub integer; n_failed integer;
BEGIN
  SELECT publish_summary INTO cur FROM public.posts
   WHERE workspace_id = r.workspace_id AND id = r.post_id FOR NO KEY UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT count(*), count(*) FILTER (WHERE state <> 'canceled'), count(*) FILTER (WHERE state = 'draft'),
         count(*) FILTER (WHERE state = 'scheduled'),
         count(*) FILTER (WHERE state IN ('publishing','retry_wait','verifying')),
         count(*) FILTER (WHERE state IN ('blocked','awaiting_manual','unconfirmed')),
         count(*) FILTER (WHERE state = 'published'), count(*) FILTER (WHERE state = 'failed')
    INTO n_any, n_live, n_draft, n_sched, n_active, n_action, n_pub, n_failed
    FROM public.post_destinations WHERE workspace_id = r.workspace_id AND post_id = r.post_id;
  nxt := CASE
    WHEN n_live = 0 AND n_any > 0 THEN 'canceled'
    WHEN n_draft = n_live THEN CASE WHEN EXISTS (SELECT 1 FROM public.approval_requests
           WHERE workspace_id = r.workspace_id AND post_id = r.post_id AND state = 'open')
         THEN 'in_review' ELSE 'draft' END
    WHEN n_draft + n_sched = n_live THEN 'scheduled'
    WHEN n_active > 0 THEN 'in_progress'
    WHEN n_action > 0 THEN 'needs_action'
    WHEN n_draft + n_sched > 0 THEN 'in_progress'
    WHEN n_pub = n_live THEN 'completed_all'
    WHEN n_failed = n_live THEN 'completed_failed'
    ELSE 'completed_partial'
  END;
  IF nxt IS DISTINCT FROM cur THEN
    UPDATE public.posts
       SET publish_summary = nxt,
           settle_seq = settle_seq + CASE WHEN nxt LIKE 'completed%' AND cur NOT LIKE 'completed%' THEN 1 ELSE 0 END
     WHERE workspace_id = r.workspace_id AND id = r.post_id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_publish_summary AFTER INSERT OR DELETE OR UPDATE OF state ON post_destinations
  FOR EACH ROW EXECUTE FUNCTION trg_publish_summary();
CREATE TRIGGER trg_publish_summary AFTER INSERT OR UPDATE OF state ON approval_requests
  FOR EACH ROW EXECUTE FUNCTION trg_publish_summary();

-- Only trg_publish_summary (trigger depth 2) writes the summary; app input to it is ignored.
CREATE FUNCTION trg_publish_summary_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF pg_trigger_depth() = 1 THEN
    IF TG_OP = 'INSERT' THEN
      NEW.publish_summary := 'draft';
      NEW.settle_seq := 0;
    ELSE
      NEW.publish_summary := OLD.publish_summary;
      NEW.settle_seq := OLD.settle_seq;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_publish_summary_guard BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION trg_publish_summary_guard();

-- Content written by a grant marks the post; the next revision inherits the taint (see trg_revision_provenance).
CREATE FUNCTION trg_mark_agent_dirty() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r record := coalesce(NEW, OLD); p uuid;
BEGIN
  IF coalesce(current_setting('app.actor', true), '') NOT LIKE 'grant:%' THEN RETURN NULL; END IF;
  IF TG_TABLE_NAME = 'item_media' THEN
    SELECT post_id INTO p FROM public.variant_items WHERE workspace_id = r.workspace_id AND id = r.item_id;
  ELSE
    p := r.post_id;
  END IF;
  UPDATE public.posts SET agent_dirty = true WHERE workspace_id = r.workspace_id AND id = p;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_agent_dirty AFTER INSERT OR UPDATE OR DELETE ON variant_items
  FOR EACH ROW EXECUTE FUNCTION trg_mark_agent_dirty();
CREATE TRIGGER trg_agent_dirty AFTER INSERT OR UPDATE OR DELETE ON item_media
  FOR EACH ROW EXECUTE FUNCTION trg_mark_agent_dirty();
CREATE TRIGGER trg_agent_dirty AFTER INSERT OR UPDATE OR DELETE ON post_variants
  FOR EACH ROW EXECUTE FUNCTION trg_mark_agent_dirty();

-- A direct UPDATE runs at trigger depth 1 and can clear agent_dirty before the human checkpoint,
-- so grant edits are recorded as human content. The clear inside trg_revision_provenance is nested.
CREATE FUNCTION trg_agent_dirty_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF pg_trigger_depth() = 1 THEN
    RAISE EXCEPTION 'agent_dirty is cleared only by recording a revision' USING ERRCODE = 'KR005';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_agent_dirty_guard BEFORE UPDATE OF agent_dirty ON posts
  FOR EACH ROW WHEN (OLD.agent_dirty AND NOT NEW.agent_dirty)
  EXECUTE FUNCTION trg_agent_dirty_guard();

CREATE FUNCTION trg_revision_provenance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE dirty boolean;
BEGIN
  NEW.created_by_user_id := app_actor_id('user');
  NEW.created_by_grant_id := app_actor_id('grant');
  SELECT agent_dirty INTO dirty FROM public.posts WHERE workspace_id = NEW.workspace_id AND id = NEW.post_id FOR UPDATE;
  NEW.agent_tainted := coalesce(dirty, false) OR NEW.created_by_grant_id IS NOT NULL;
  UPDATE public.posts SET agent_dirty = false WHERE workspace_id = NEW.workspace_id AND id = NEW.post_id AND agent_dirty;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_revision_provenance BEFORE INSERT ON post_revisions
  FOR EACH ROW EXECUTE FUNCTION trg_revision_provenance();
CREATE TRIGGER trg_revision_immutable BEFORE UPDATE ON post_revisions
  FOR EACH ROW EXECUTE FUNCTION forbid_update();

-- Agent authorship is sticky per destination until a human-authored revision changes that destination's hash.
CREATE FUNCTION trg_revision_dest_agent() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tainted boolean; prev_hash bytea; prev_flag boolean;
BEGIN
  SELECT agent_tainted INTO tainted FROM public.post_revisions
   WHERE workspace_id = NEW.workspace_id AND post_id = NEW.post_id AND post_version = NEW.post_version;
  SELECT content_hash, agent_authored INTO prev_hash, prev_flag FROM public.revision_destinations
   WHERE workspace_id = NEW.workspace_id AND post_id = NEW.post_id AND social_account_id = NEW.social_account_id
     AND publish_type = NEW.publish_type AND post_version < NEW.post_version
   ORDER BY post_version DESC LIMIT 1;
  NEW.agent_authored := (coalesce(tainted, false) AND prev_hash IS DISTINCT FROM NEW.content_hash)
                     OR (coalesce(prev_flag, false) AND prev_hash = NEW.content_hash);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_revision_dest_agent BEFORE INSERT ON revision_destinations
  FOR EACH ROW EXECUTE FUNCTION trg_revision_dest_agent();
CREATE TRIGGER trg_revision_dest_immutable BEFORE UPDATE ON revision_destinations
  FOR EACH ROW EXECUTE FUNCTION forbid_update();

CREATE FUNCTION trg_approval_request_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n integer; live_self boolean; allow_self boolean; policy_min smallint;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'open' THEN RAISE EXCEPTION 'requests start open' USING ERRCODE = 'KR001'; END IF;
    IF app_actor() LIKE 'user:%' THEN
      IF NEW.requested_by_user_id IS DISTINCT FROM app_actor_id('user') THEN
        RAISE EXCEPTION 'requested_by must be the acting user' USING ERRCODE = 'KR006';
      END IF;
    ELSIF app_actor() LIKE 'grant:%' THEN
      IF NEW.requested_by_grant_id IS DISTINCT FROM app_actor_id('grant') THEN
        RAISE EXCEPTION 'requested_by must be the acting grant' USING ERRCODE = 'KR006';
      END IF;
    ELSE
      RAISE EXCEPTION 'only a user or grant can open an approval request' USING ERRCODE = 'KR006';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.state IS DISTINCT FROM OLD.state THEN
    IF NOT ((OLD.state = 'open' AND NEW.state IN ('approved','rejected','voided','withdrawn'))
         OR (OLD.state = 'approved' AND NEW.state = 'revoked')) THEN
      RAISE EXCEPTION 'illegal approval transition % -> %', OLD.state, NEW.state USING ERRCODE = 'KR001';
    END IF;
    IF NEW.state IN ('approved','rejected','revoked') AND app_actor() !~ '^(user|reviewer):' THEN
      RAISE EXCEPTION 'only a human or reviewer can decide' USING ERRCODE = 'KR006';
    END IF;
    IF NEW.state = 'approved' THEN
      -- The snapshot is caller-written, so it may only narrow the live policy (brand override, else workspace), and the live approval count is a floor.
      SELECT p.allow_self_approval, p.required_approvals INTO live_self, policy_min
        FROM public.posts po JOIN public.approval_policies p
          ON p.workspace_id = po.workspace_id AND (p.brand_id = po.brand_id OR p.brand_id IS NULL)
       WHERE po.workspace_id = NEW.workspace_id AND po.id = NEW.post_id
       ORDER BY p.brand_id NULLS LAST LIMIT 1;
      allow_self := coalesce(live_self, false)
                    AND coalesce(NEW.policy_snapshot->'allow_self_approval' = 'true'::jsonb, false);
      SELECT count(*) INTO n FROM public.approval_decisions d
       WHERE d.workspace_id = NEW.workspace_id AND d.request_id = NEW.id AND d.decision = 'approve'
         AND (allow_self OR d.approver_kind = 'reviewer' OR d.user_id IS DISTINCT FROM NEW.requested_by_user_id);
      IF n < greatest(NEW.required_approvals, policy_min) THEN
        RAISE EXCEPTION 'request has % of % qualifying approvals', n, greatest(NEW.required_approvals, policy_min)
          USING ERRCODE = 'KR004';
      END IF;
    END IF;
    IF NEW.state = 'revoked' AND EXISTS (SELECT 1 FROM public.post_destinations
        WHERE workspace_id = NEW.workspace_id AND approval_request_id = NEW.id AND state <> 'published') THEN
      RAISE EXCEPTION 'unbind destinations before revoking' USING ERRCODE = 'KR004';
    END IF;
  END IF;
  IF (NEW.post_id, NEW.post_version, NEW.content_hash, NEW.policy_snapshot, NEW.required_approvals,
      NEW.requested_by_user_id, NEW.requested_by_grant_id)
     IS DISTINCT FROM (OLD.post_id, OLD.post_version, OLD.content_hash, OLD.policy_snapshot, OLD.required_approvals,
      OLD.requested_by_user_id, OLD.requested_by_grant_id) THEN
    RAISE EXCEPTION 'approval request content is immutable' USING ERRCODE = 'KR005';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_approval_request_guard BEFORE INSERT OR UPDATE ON approval_requests
  FOR EACH ROW EXECUTE FUNCTION trg_approval_request_guard();
CREATE TRIGGER trg_ard_immutable BEFORE UPDATE ON approval_request_destinations
  FOR EACH ROW EXECUTE FUNCTION forbid_update();

-- tolerance_min is caller-written. It may only narrow the live policy (brand override, else workspace).
-- No policy means the documented default of 0, and the cap keeps approved_tolerance_min * 60 inside int4.
CREATE FUNCTION trg_approval_dest_tolerance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE policy_tol integer;
BEGIN
  IF NEW.tolerance_min IS NULL THEN RETURN NEW; END IF;
  SELECT p.reschedule_tolerance_min INTO policy_tol
    FROM public.approval_requests r
    JOIN public.posts po ON po.workspace_id = r.workspace_id AND po.id = r.post_id
    JOIN public.approval_policies p
      ON p.workspace_id = po.workspace_id AND (p.brand_id = po.brand_id OR p.brand_id IS NULL)
   WHERE r.workspace_id = NEW.workspace_id AND r.id = NEW.request_id
   ORDER BY p.brand_id NULLS LAST
   LIMIT 1;
  IF NEW.tolerance_min > coalesce(policy_tol, 0) THEN
    RAISE EXCEPTION 'reschedule tolerance % exceeds the live policy %', NEW.tolerance_min, coalesce(policy_tol, 0)
      USING ERRCODE = 'KR004';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_approval_dest_tolerance BEFORE INSERT ON approval_request_destinations
  FOR EACH ROW EXECUTE FUNCTION trg_approval_dest_tolerance();

CREATE FUNCTION trg_decision_actor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT ((NEW.approver_kind = 'user' AND NEW.user_id IS NOT DISTINCT FROM app_actor_id('user'))
       OR (NEW.approver_kind = 'reviewer' AND NEW.review_link_id IS NOT DISTINCT FROM app_actor_id('reviewer'))) THEN
    RAISE EXCEPTION 'decision must come from the acting human or reviewer' USING ERRCODE = 'KR006';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_decision_actor BEFORE INSERT ON approval_decisions
  FOR EACH ROW EXECUTE FUNCTION trg_decision_actor();
CREATE TRIGGER trg_decision_immutable BEFORE UPDATE ON approval_decisions
  FOR EACH ROW EXECUTE FUNCTION forbid_update();

CREATE FUNCTION trg_attempt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.finished_at IS NOT NULL THEN RAISE EXCEPTION 'finished attempts are immutable' USING ERRCODE = 'KR005'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_attempt_guard BEFORE UPDATE ON publish_attempts
  FOR EACH ROW EXECUTE FUNCTION trg_attempt_guard();

-- The approval hash covers media sha256; a ready master must never change underneath it.
CREATE FUNCTION trg_media_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.state = 'ready' AND (NEW.sha256, NEW.mime, NEW.bytes, NEW.kind, NEW.storage_key)
     IS DISTINCT FROM (OLD.sha256, OLD.mime, OLD.bytes, OLD.kind, OLD.storage_key) THEN
    RAISE EXCEPTION 'ready media master is immutable; re-encode = new rendition' USING ERRCODE = 'KR005';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_media_guard BEFORE UPDATE ON media_assets FOR EACH ROW EXECUTE FUNCTION trg_media_guard();

-- Rejects backdated or forward-dated rows; occurred_at is always the inserting transaction's time.
CREATE FUNCTION trg_audit_time() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.occurred_at IS DISTINCT FROM now() THEN
    RAISE EXCEPTION 'audit occurred_at is set by the database' USING ERRCODE = 'KR005';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_audit_time BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION trg_audit_time();

DO $$
DECLARE t regclass;
BEGIN
  FOR t IN SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'updated_at' AND NOT a.attisdropped
           WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relispartition LOOP
    EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t);
  END LOOP;
END $$;

-- Owned by the migration role (table owner, RLS not forced), so they see every tenant. Lookups take only an
-- unguessable hash or the caller's own identity and return the minimum the caller needs. Sweeps return
-- (workspace_id, id) only, cap the batch at 1000 and order deterministically; the caller re-reads each row
-- inside withTenant(). Sweeps that lead to an external side effect return nothing while publishing is paused.
-- The allowlist test fails on any definer function not listed in ADR-0048.

CREATE FUNCTION instance_paused() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.instance_state WHERE publishing_paused)
$$;

CREATE FUNCTION app_organization_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT organization_id FROM public.workspaces WHERE id = app_workspace_id()
$$;

CREATE FUNCTION auth_lookup_grant_token(p_hash bytea)
RETURNS TABLE (workspace_id uuid, grant_id uuid, token_kind text, scopes text[], sponsor_user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT t.workspace_id, t.grant_id, t.kind, g.scopes, g.sponsor_user_id
    FROM grant_tokens t JOIN access_grants g ON g.workspace_id = t.workspace_id AND g.id = t.grant_id
   WHERE t.token_hash = p_hash AND t.revoked_at IS NULL AND g.revoked_at IS NULL
     AND (t.expires_at IS NULL OR t.expires_at > now()) AND (g.expires_at IS NULL OR g.expires_at > now())
$$;

CREATE FUNCTION auth_lookup_review_link(p_hash bytea)
RETURNS TABLE (workspace_id uuid, review_link_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT workspace_id, id FROM review_links
   WHERE token_hash = p_hash AND revoked_at IS NULL AND expires_at > now()
$$;

CREATE FUNCTION auth_lookup_session(p_hash bytea)
RETURNS TABLE (session_id uuid, user_id uuid, expires_at timestamptz, idle_expires_at timestamptz,
               reauthenticated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT s.id, s.user_id, s.expires_at, s.idle_expires_at, s.reauthenticated_at
    FROM sessions s JOIN users u ON u.id = s.user_id
   WHERE s.token_hash = p_hash AND s.expires_at > now() AND s.idle_expires_at > now() AND u.erased_at IS NULL
$$;

-- Login only: no other caller may need a password hash before the actor is known.
CREATE FUNCTION auth_login_lookup(p_email_normalized text)
RETURNS TABLE (user_id uuid, password_hash text, totp_enabled boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT id, password_hash, totp_secret_ciphertext IS NOT NULL FROM users
   WHERE email_normalized = p_email_normalized AND erased_at IS NULL
$$;

CREATE FUNCTION auth_create_user(p_email text, p_email_normalized text, p_display_name text,
                                 p_password_hash text, p_ui_locale text)
RETURNS uuid
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  INSERT INTO users (email, email_normalized, display_name, password_hash, ui_locale)
  VALUES (p_email, p_email_normalized, p_display_name, p_password_hash, p_ui_locale)
  RETURNING id
$$;

CREATE FUNCTION auth_user_workspaces(p_user uuid)
RETURNS TABLE (workspace_id uuid, organization_id uuid, name text, role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_user IS NULL OR p_user IS DISTINCT FROM app_actor_id('user') THEN
    RAISE EXCEPTION 'only the acting user can list their workspaces' USING ERRCODE = 'KR006';
  END IF;
  RETURN QUERY
  SELECT w.id, w.organization_id, w.name, m.role FROM memberships m JOIN workspaces w ON w.id = m.workspace_id
   WHERE m.user_id = p_user AND w.deletion_requested_at IS NULL;
END $$;

CREATE FUNCTION workspace_member_profiles()
RETURNS TABLE (user_id uuid, display_name text, email text, role text, can_approve boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT m.user_id, u.display_name, u.email, m.role, m.can_approve
    FROM memberships m JOIN users u ON u.id = m.user_id
   WHERE m.workspace_id = app_workspace_id()
   ORDER BY m.user_id
$$;

CREATE FUNCTION provision_organization(p_org_name text, p_ws_name text, p_ws_slug text, p_timezone text)
RETURNS TABLE (organization_id uuid, workspace_id uuid)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
#variable_conflict use_column
DECLARE u uuid := app_actor_id('user'); o uuid; w uuid;
BEGIN
  IF u IS NULL OR NOT EXISTS (SELECT 1 FROM users WHERE id = u AND erased_at IS NULL) THEN
    RAISE EXCEPTION 'provisioning needs a live user actor' USING ERRCODE = 'KR006';
  END IF;
  INSERT INTO organizations (name) VALUES (p_org_name) RETURNING id INTO o;
  INSERT INTO workspaces (organization_id, name, slug, timezone) VALUES (o, p_ws_name, p_ws_slug, p_timezone)
  RETURNING id INTO w;
  INSERT INTO memberships (workspace_id, user_id, role, can_approve) VALUES (w, u, 'owner', true);
  INSERT INTO approval_policies (workspace_id, mode, allow_self_approval) VALUES (w, 'none', true);
  RETURN QUERY SELECT o, w;
END $$;

CREATE FUNCTION provision_workspace(p_organization_id uuid, p_ws_name text, p_ws_slug text, p_timezone text)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE u uuid := app_actor_id('user'); w uuid;
BEGIN
  IF u IS NULL OR NOT EXISTS (
    SELECT 1 FROM memberships m JOIN workspaces x ON x.id = m.workspace_id
     WHERE m.user_id = u AND m.role = 'owner' AND x.organization_id = p_organization_id
       AND x.deletion_requested_at IS NULL) THEN
    RAISE EXCEPTION 'only an owner in this organization can add a workspace' USING ERRCODE = 'KR006';
  END IF;
  INSERT INTO workspaces (organization_id, name, slug, timezone)
  VALUES (p_organization_id, p_ws_name, p_ws_slug, p_timezone) RETURNING id INTO w;
  INSERT INTO memberships (workspace_id, user_id, role, can_approve) VALUES (w, u, 'owner', true);
  INSERT INTO approval_policies (workspace_id, mode, allow_self_approval) VALUES (w, 'none', true);
  RETURN w;
END $$;

-- The app may only pause (the safe direction); release and restore marking are operator-only.
CREATE FUNCTION instance_fence(p_instance_id uuid)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s instance_state;
BEGIN
  INSERT INTO instance_state (instance_id) VALUES (p_instance_id) ON CONFLICT (singleton) DO NOTHING;
  SELECT * INTO s FROM instance_state FOR UPDATE;
  IF s.instance_id <> p_instance_id AND NOT s.publishing_paused THEN
    UPDATE instance_state SET publishing_paused = true, paused_reason = 'instance_id_mismatch';
    INSERT INTO security_events (kind, detail) VALUES ('instance.fenced', jsonb_build_object('epoch', s.restore_epoch));
    RETURN true;
  END IF;
  RETURN s.publishing_paused;
END $$;

CREATE FUNCTION instance_pause()
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE instance_state SET publishing_paused = true, paused_reason = 'operator' WHERE NOT publishing_paused;
  INSERT INTO security_events (kind) VALUES ('instance.paused');
END $$;

CREATE FUNCTION instance_mark_restored()
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE e integer;
BEGIN
  UPDATE instance_state SET restore_epoch = restore_epoch + 1, publishing_paused = true,
         paused_reason = 'restore_quarantine'
  RETURNING restore_epoch INTO e;
  IF e IS NULL THEN RAISE EXCEPTION 'instance_state missing' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO security_events (kind, detail) VALUES ('instance.restored', jsonb_build_object('epoch', e));
  RETURN e;
END $$;

CREATE FUNCTION instance_release(p_instance_id uuid)
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_instance_id IS NULL THEN RAISE EXCEPTION 'instance id required' USING ERRCODE = '22004'; END IF;
  UPDATE instance_state SET instance_id = p_instance_id, publishing_paused = false, paused_reason = NULL;
  INSERT INTO security_events (kind) VALUES ('instance.released');
END $$;

CREATE FUNCTION sweep_due_destinations(p_limit integer)
RETURNS TABLE (workspace_id uuid, destination_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT d.workspace_id, d.id FROM post_destinations d
   WHERE d.state IN ('scheduled','retry_wait') AND d.run_at <= now() AND NOT instance_paused()
   ORDER BY d.run_at, d.workspace_id, d.id LIMIT least(greatest(p_limit, 0), 1000)
$$;

CREATE FUNCTION sweep_expired_leases(p_limit integer)
RETURNS TABLE (workspace_id uuid, destination_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT d.workspace_id, d.id FROM post_destinations d
   WHERE d.state = 'publishing' AND d.lease_until < now() - interval '30 seconds' AND NOT instance_paused()
   ORDER BY d.lease_until, d.workspace_id, d.id LIMIT least(greatest(p_limit, 0), 1000)
$$;

CREATE FUNCTION sweep_verifying_destinations(p_limit integer)
RETURNS TABLE (workspace_id uuid, destination_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT d.workspace_id, d.id FROM post_destinations d
   WHERE d.state = 'verifying' AND NOT instance_paused()
   ORDER BY d.updated_at, d.workspace_id, d.id LIMIT least(greatest(p_limit, 0), 1000)
$$;

-- Only past-due rows that have not been sent: publishing rows stay put and the lease reaper classifies them
-- by public_send_at after release, so quarantine can never turn an ambiguous send into a fresh one.
CREATE FUNCTION sweep_quarantine_destinations(p_limit integer)
RETURNS TABLE (workspace_id uuid, destination_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT d.workspace_id, d.id FROM post_destinations d
   WHERE d.state IN ('scheduled','retry_wait') AND d.run_at <= now()
     AND EXISTS (SELECT 1 FROM instance_state
                  WHERE publishing_paused AND paused_reason IN ('restore_quarantine','instance_id_mismatch'))
   ORDER BY d.run_at, d.workspace_id, d.id LIMIT least(greatest(p_limit, 0), 1000)
$$;

CREATE FUNCTION sweep_expiring_credentials(p_within interval, p_limit integer)
RETURNS TABLE (workspace_id uuid, credential_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT c.workspace_id, c.id FROM account_credentials c
    JOIN social_accounts a ON a.workspace_id = c.workspace_id AND a.id = c.social_account_id
   WHERE least(c.access_expires_at, c.refresh_expires_at) <= now() + least(p_within, interval '7 days')
     AND (c.refresh_lease_until IS NULL OR c.refresh_lease_until < now())
     AND a.status = 'active' AND NOT instance_paused()
   ORDER BY least(c.access_expires_at, c.refresh_expires_at), c.workspace_id, c.id LIMIT least(greatest(p_limit, 0), 1000)
$$;

CREATE FUNCTION sweep_due_webhook_deliveries(p_limit integer)
RETURNS TABLE (workspace_id uuid, delivery_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT d.workspace_id, d.id FROM webhook_deliveries d
   WHERE d.state IN ('pending','retry_wait') AND d.next_attempt_at <= now() AND NOT instance_paused()
   ORDER BY d.next_attempt_at, d.workspace_id, d.id LIMIT least(greatest(p_limit, 0), 1000)
$$;

-- Candidates only; the GC job re-checks every reference inside withTenant() before deleting an object.
CREATE FUNCTION sweep_media_gc(p_limit integer)
RETURNS TABLE (workspace_id uuid, media_asset_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT DISTINCT c.workspace_id, c.id FROM (
    SELECT m.workspace_id, m.id FROM media_assets m
     WHERE m.deleted_at < now() - interval '30 days' AND m.original_purged_at IS NULL
    UNION ALL
    SELECT m.workspace_id, m.id FROM media_assets m
     WHERE m.state = 'uploading' AND m.created_at < now() - interval '7 days'
    UNION ALL
    SELECT r.workspace_id, r.media_asset_id FROM media_renditions r WHERE r.expires_at < now()
  ) c
   WHERE NOT instance_paused()
   ORDER BY c.workspace_id, c.id LIMIT least(greatest(p_limit, 0), 1000)
$$;

-- For daily jobs that touch only this database (retention, deletion grace). Keyset-paged by id.
CREATE FUNCTION sweep_workspaces(p_after uuid, p_limit integer)
RETURNS TABLE (workspace_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT w.id FROM workspaces w
   WHERE p_after IS NULL OR w.id > p_after
   ORDER BY w.id LIMIT least(greatest(p_limit, 0), 1000)
$$;

CREATE FUNCTION purge_instance_retention(p_limit integer)
RETURNS TABLE (relation text, affected bigint)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE lim integer := least(greatest(p_limit, 0), 10000); n bigint;
BEGIN
  DELETE FROM sessions WHERE id IN (SELECT id FROM sessions
    WHERE expires_at < now() OR idle_expires_at < now() ORDER BY id LIMIT lim);
  GET DIAGNOSTICS n = ROW_COUNT; relation := 'sessions'; affected := n; RETURN NEXT;

  DELETE FROM security_events WHERE id IN (SELECT id FROM security_events
    WHERE occurred_at < now() - interval '400 days' ORDER BY occurred_at, id LIMIT lim);
  GET DIAGNOSTICS n = ROW_COUNT; relation := 'security_events'; affected := n; RETURN NEXT;

  UPDATE security_events SET ip_prefix = NULL WHERE id IN (SELECT id FROM security_events
    WHERE ip_prefix IS NOT NULL AND occurred_at < now() - interval '90 days' ORDER BY occurred_at, id LIMIT lim);
  GET DIAGNOSTICS n = ROW_COUNT; relation := 'security_events.ip_prefix'; affected := n; RETURN NEXT;

  DELETE FROM inbound_events WHERE (source, external_id) IN (SELECT source, external_id FROM inbound_events
    WHERE received_at < now() - interval '30 days' ORDER BY received_at, source, external_id LIMIT lim);
  GET DIAGNOSTICS n = ROW_COUNT; relation := 'inbound_events'; affected := n; RETURN NEXT;

  DELETE FROM ephemeral_kv WHERE key IN (SELECT key FROM ephemeral_kv
    WHERE expires_at < now() ORDER BY expires_at, key LIMIT lim);
  GET DIAGNOSTICS n = ROW_COUNT; relation := 'ephemeral_kv'; affected := n; RETURN NEXT;

  DELETE FROM rate_buckets WHERE key IN (SELECT key FROM rate_buckets
    WHERE updated_at < now() - interval '30 days' AND (blocked_until IS NULL OR blocked_until < now())
    ORDER BY updated_at, key LIMIT lim);
  GET DIAGNOSTICS n = ROW_COUNT; relation := 'rate_buckets'; affected := n; RETURN NEXT;

  DELETE FROM cron_runs WHERE id IN (SELECT id FROM cron_runs
    WHERE started_at < now() - interval '90 days' ORDER BY started_at, id LIMIT lim);
  GET DIAGNOSTICS n = ROW_COUNT; relation := 'cron_runs'; affected := n; RETURN NEXT;

  DELETE FROM worker_heartbeats WHERE seen_at < now() - interval '7 days';
  GET DIAGNOSTICS n = ROW_COUNT; relation := 'worker_heartbeats'; affected := n; RETURN NEXT;
END $$;

-- The app role has no DDL on audit_events, so partition upkeep runs here. A month whose rows already sit in
-- the default partition cannot get its own partition; the default partition's count is returned as an alert.
CREATE FUNCTION maintain_audit_partitions(p_limit integer)
RETURNS TABLE (relation text, affected bigint)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp SET lock_timeout = '3s'
SET TimeZone = 'UTC' AS $$
DECLARE lim integer := least(greatest(p_limit, 0), 10000); n bigint := 0; lo timestamptz; part text;
BEGIN
  FOR i IN 0..2 LOOP
    lo := date_trunc('month', now()) + make_interval(months => i);
    part := 'audit_events_p' || to_char(lo, 'YYYYMM');
    IF to_regclass(part) IS NULL AND NOT EXISTS (SELECT 1 FROM audit_events_default
                                                  WHERE occurred_at >= lo AND occurred_at < lo + interval '1 month') THEN
      EXECUTE format('CREATE TABLE %I PARTITION OF audit_events FOR VALUES FROM (%L) TO (%L)',
                     part, lo, lo + interval '1 month');
      n := n + 1;
    END IF;
  END LOOP;
  relation := 'audit_events.created'; affected := n; RETURN NEXT;

  n := 0;
  FOR part IN SELECT c.relname FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid
               WHERE i.inhparent = 'audit_events'::regclass AND c.relname ~ '^audit_events_p[0-9]{6}$'
                 AND to_timestamp(substr(c.relname, 15), 'YYYYMM') + interval '1 month' <= now() - interval '400 days'
               ORDER BY c.relname LOOP
    EXECUTE format('DROP TABLE %I', part);
    n := n + 1;
  END LOOP;
  relation := 'audit_events.dropped'; affected := n; RETURN NEXT;

  UPDATE audit_events SET ip_prefix = NULL, ua_hash = NULL
   WHERE (workspace_id, occurred_at, id) IN (SELECT workspace_id, occurred_at, id FROM audit_events
     WHERE (ip_prefix IS NOT NULL OR ua_hash IS NOT NULL) AND occurred_at < now() - interval '90 days'
     ORDER BY occurred_at, workspace_id, id LIMIT lim);
  GET DIAGNOSTICS n = ROW_COUNT; relation := 'audit_events.pii'; affected := n; RETURN NEXT;

  SELECT count(*) INTO n FROM audit_events_default;
  relation := 'audit_events_default'; affected := n; RETURN NEXT;
END $$;

-- Aggregates only, never ids: the admin page reads it without a tenant.
CREATE FUNCTION slo_publish_stats(p_from timestamptz, p_to timestamptz)
RETURNS TABLE (auto_total bigint, on_time bigint, unconfirmed bigint, provider_5xx bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_to <= p_from OR p_to - p_from > interval '31 days' THEN
    RAISE EXCEPTION 'window must be positive and at most 31 days' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  SELECT count(*),
         count(*) FILTER (WHERE d.published_at <= d.scheduled_at + interval '60 seconds'),
         count(*) FILTER (WHERE d.state = 'unconfirmed'),
         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM publish_attempts a
                                         WHERE a.workspace_id = d.workspace_id AND a.destination_id = d.id
                                           AND a.http_status BETWEEN 500 AND 599))
    FROM post_destinations d
   WHERE d.delivery_mode = 'auto' AND d.state NOT IN ('draft','canceled')
     AND d.scheduled_at >= p_from AND d.scheduled_at < p_to;
END $$;

DO $$
DECLARE f regprocedure;
BEGIN
  FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.prosecdef LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION
  auth_lookup_grant_token(bytea), auth_lookup_review_link(bytea), auth_lookup_session(bytea),
  auth_login_lookup(text), auth_create_user(text, text, text, text, text), auth_user_workspaces(uuid),
  workspace_member_profiles(), provision_organization(text, text, text, text),
  provision_workspace(uuid, text, text, text), instance_fence(uuid),
  sweep_due_destinations(integer), sweep_expired_leases(integer), sweep_verifying_destinations(integer),
  sweep_quarantine_destinations(integer), sweep_expiring_credentials(interval, integer),
  sweep_due_webhook_deliveries(integer), sweep_media_gc(integer), sweep_workspaces(uuid, integer),
  purge_instance_retention(integer), maintain_audit_partitions(integer), slo_publish_stats(timestamptz, timestamptz)
TO kronaut_app;

GRANT EXECUTE ON FUNCTION instance_pause(), instance_mark_restored(), instance_release(uuid),
  slo_publish_stats(timestamptz, timestamptz)
TO kronaut_operator;

-- Tenant tables (they have workspace_id) get full DML under the tenant policy. Every other table is
-- default-deny: a new global table is unreachable until a grant below names it (ADR-0048).

DO $$
DECLARE t regclass;
BEGIN
  FOR t IN SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND NOT c.relispartition
             AND EXISTS (SELECT 1 FROM pg_attribute a
                          WHERE a.attrelid = c.oid AND a.attname = 'workspace_id' AND NOT a.attisdropped) LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %s TO kronaut_app', t);
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %s USING (workspace_id = app_workspace_id())'
                   ' WITH CHECK (workspace_id = app_workspace_id())', t);
  END LOOP;
END $$;

REVOKE UPDATE, DELETE ON audit_events FROM kronaut_app;
REVOKE INSERT, UPDATE, DELETE ON audit_seals FROM kronaut_app;
REVOKE UPDATE ON post_revisions, revision_destinations, approval_request_destinations, approval_decisions FROM kronaut_app;

-- Workspaces are created only through provision_*; moving one between organizations is not an app operation.
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON workspaces USING (id = app_workspace_id()) WITH CHECK (id = app_workspace_id());
GRANT SELECT, UPDATE (name, slug, timezone, default_language, deletion_requested_at), DELETE ON workspaces TO kronaut_app;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlement_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON organizations TO kronaut_app USING (id = app_organization_id());
CREATE POLICY org_isolation ON entitlement_overrides FOR SELECT TO kronaut_app
  USING (organization_id = app_organization_id());
CREATE POLICY org_isolation ON usage_counters TO kronaut_app
  USING (organization_id = app_organization_id()) WITH CHECK (organization_id = app_organization_id());
GRANT SELECT, UPDATE (name) ON organizations TO kronaut_app;
GRANT SELECT ON entitlement_overrides TO kronaut_app;
GRANT SELECT, INSERT, UPDATE ON usage_counters TO kronaut_app;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY self_only ON users TO kronaut_app USING (id = app_actor_id('user'));
CREATE POLICY self_only ON sessions TO kronaut_app USING (user_id = app_actor_id('user'));
CREATE POLICY self_read ON security_events FOR SELECT TO kronaut_app USING (user_id = app_actor_id('user'));
CREATE POLICY append ON security_events FOR INSERT TO kronaut_app WITH CHECK (true);
GRANT SELECT, UPDATE (email, email_normalized, display_name, password_hash, totp_secret_ciphertext, totp_nonce,
  totp_wrapped_dek, totp_kek_version, totp_last_step, ui_locale, display_timezone, erased_at) ON users TO kronaut_app;
GRANT SELECT, INSERT, UPDATE (idle_expires_at, reauthenticated_at), DELETE ON sessions TO kronaut_app;
GRANT SELECT, INSERT ON security_events TO kronaut_app;
GRANT INSERT ON deletion_receipts TO kronaut_app;

-- Instance-wide apps (instance_host = '') and the disabled state belong to the operator; the app may register
-- per-instance apps (Mastodon) and report health.
ALTER TABLE provider_apps ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_read ON provider_apps FOR SELECT TO kronaut_app USING (true);
CREATE POLICY app_register ON provider_apps FOR INSERT TO kronaut_app WITH CHECK (instance_host <> '');
CREATE POLICY app_health ON provider_apps FOR UPDATE TO kronaut_app
  USING (status <> 'disabled') WITH CHECK (status <> 'disabled');
GRANT SELECT, INSERT, UPDATE (status, last_verified_at) ON provider_apps TO kronaut_app;

GRANT SELECT ON instance_state, destination_transitions, destination_state_reasons, provider_app_keys TO kronaut_app;
GRANT SELECT, INSERT, UPDATE ON provider_app_incidents, rate_buckets, worker_heartbeats, cron_runs TO kronaut_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ephemeral_kv TO kronaut_app;
GRANT SELECT, INSERT, UPDATE (processed_at) ON inbound_events TO kronaut_app;

CREATE POLICY operator_all ON provider_apps TO kronaut_operator USING (true) WITH CHECK (true);
CREATE POLICY operator_all ON entitlement_overrides TO kronaut_operator USING (true) WITH CHECK (true);
CREATE POLICY operator_read ON organizations FOR SELECT TO kronaut_operator USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_apps, provider_app_keys, entitlement_overrides TO kronaut_operator;
GRANT SELECT ON organizations, instance_state, provider_app_incidents, worker_heartbeats, cron_runs,
  deletion_receipts TO kronaut_operator;
GRANT UPDATE (resolved_at) ON provider_app_incidents TO kronaut_operator;

-- Unqualified names in triggers and RLS helpers resolve pg_temp first, so a temporary table could stand in for a real one.
DO $$ BEGIN
  EXECUTE format('REVOKE TEMPORARY ON DATABASE %I FROM PUBLIC', current_database());
  IF has_database_privilege('kronaut_app', current_database(), 'TEMPORARY')
     OR has_database_privilege('kronaut_operator', current_database(), 'TEMPORARY') THEN
    RAISE EXCEPTION 'kronaut_app and kronaut_operator can still create temporary tables; revoke TEMPORARY on this database from PUBLIC as its owner';
  END IF;
END $$;

SELECT maintain_audit_partitions(0);
