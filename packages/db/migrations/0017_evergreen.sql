CREATE TABLE evergreen_posts (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  post_id uuid NOT NULL,
  owner_user_id uuid REFERENCES users,
  owner_grant_id uuid,
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active','removed')),
  state_reason text CHECK (state_reason IN ('owner_lost','copy_failed','unmarked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, post_id),
  FOREIGN KEY (workspace_id, post_id) REFERENCES posts ON DELETE CASCADE,
  CHECK (num_nonnulls(owner_user_id, owner_grant_id) = 1),
  FOREIGN KEY (workspace_id, owner_grant_id) REFERENCES access_grants
);

ALTER TABLE evergreen_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON evergreen_posts USING (workspace_id = app_workspace_id())
  WITH CHECK (workspace_id = app_workspace_id());

GRANT SELECT, INSERT, UPDATE ON evergreen_posts TO kronaut_app;

CREATE TABLE evergreen_runs (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  evergreen_post_id uuid NOT NULL,
  social_account_id uuid NOT NULL,
  copy_post_id uuid,
  slot_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  FOREIGN KEY (workspace_id, evergreen_post_id) REFERENCES evergreen_posts ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, social_account_id) REFERENCES social_accounts ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, copy_post_id) REFERENCES posts ON DELETE SET NULL (copy_post_id)
);

CREATE INDEX ix_evergreen_runs_channel
  ON evergreen_runs (workspace_id, social_account_id, evergreen_post_id, slot_at DESC);

ALTER TABLE evergreen_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON evergreen_runs USING (workspace_id = app_workspace_id())
  WITH CHECK (workspace_id = app_workspace_id());

GRANT SELECT, INSERT, UPDATE (copy_post_id) ON evergreen_runs TO kronaut_app;
