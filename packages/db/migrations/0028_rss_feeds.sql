CREATE TABLE rss_feeds (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  url text NOT NULL CHECK (char_length(url) <= 2048),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  mode text NOT NULL CHECK (mode IN ('queue','draft')),
  template text NOT NULL CHECK (char_length(template) BETWEEN 1 AND 1000),
  owner_user_id uuid NOT NULL REFERENCES users,
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active','paused')),
  paused_reason text CHECK (paused_reason IN ('manual','owner_lost','fetch_failing')),
  etag text CHECK (char_length(etag) <= 1024),
  last_modified text CHECK (char_length(last_modified) <= 128),
  last_checked_at timestamptz,
  last_error text CHECK (last_error IN ('url_blocked','fetch_failed','timed_out','too_large','feed_invalid')),
  failing_since timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  CHECK ((state = 'paused') = (paused_reason IS NOT NULL)),
  CHECK ((last_error IS NULL) = (failing_since IS NULL))
);

CREATE INDEX ix_rss_feeds_due ON rss_feeds (workspace_id, last_checked_at) WHERE state = 'active';

ALTER TABLE rss_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON rss_feeds USING (workspace_id = app_workspace_id())
  WITH CHECK (workspace_id = app_workspace_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON rss_feeds TO kronaut_app;

CREATE TABLE rss_feed_channels (
  workspace_id uuid NOT NULL,
  feed_id uuid NOT NULL,
  social_account_id uuid NOT NULL,
  PRIMARY KEY (workspace_id, feed_id, social_account_id),
  FOREIGN KEY (workspace_id, feed_id) REFERENCES rss_feeds ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, social_account_id) REFERENCES social_accounts ON DELETE CASCADE
);

CREATE INDEX ix_rss_feed_channels_account ON rss_feed_channels (workspace_id, social_account_id);

ALTER TABLE rss_feed_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON rss_feed_channels USING (workspace_id = app_workspace_id())
  WITH CHECK (workspace_id = app_workspace_id());

GRANT SELECT, INSERT, DELETE ON rss_feed_channels TO kronaut_app;

CREATE TABLE rss_items (
  workspace_id uuid NOT NULL,
  feed_id uuid NOT NULL,
  key bytea NOT NULL CHECK (octet_length(key) = 32),
  outcome text NOT NULL CHECK (outcome IN ('seen','scheduled','requested','drafted','retrying','failed')),
  error_code text CHECK (error_code ~ '^[a-z_]{1,64}$'),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  post_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, feed_id, key),
  FOREIGN KEY (workspace_id, feed_id) REFERENCES rss_feeds ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, post_id) REFERENCES posts ON DELETE SET NULL (post_id),
  CHECK ((outcome = 'failed') = (error_code IS NOT NULL))
);

CREATE INDEX ix_rss_items_seen ON rss_items (workspace_id, last_seen_at);

CREATE INDEX ix_rss_items_post ON rss_items (workspace_id, post_id) WHERE post_id IS NOT NULL;

ALTER TABLE rss_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON rss_items USING (workspace_id = app_workspace_id())
  WITH CHECK (workspace_id = app_workspace_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON rss_items TO kronaut_app;
