CREATE TABLE post_series (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  rrule text NOT NULL CHECK (length(rrule) BETWEEN 1 AND 200),
  dtstart_local timestamp NOT NULL,
  timezone iana_tz NOT NULL,
  owner_user_id uuid REFERENCES users,
  owner_grant_id uuid,
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active','paused','ended','stopped')),
  state_reason text CHECK (state_reason IN ('owner_lost','advance_failed','count_reached','until_passed','occurrences_deleted')),
  occurrences integer NOT NULL DEFAULT 1 CHECK (occurrences >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  CHECK (num_nonnulls(owner_user_id, owner_grant_id) = 1),
  FOREIGN KEY (workspace_id, owner_grant_id) REFERENCES access_grants
);

ALTER TABLE post_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON post_series USING (workspace_id = app_workspace_id())
  WITH CHECK (workspace_id = app_workspace_id());

GRANT SELECT, INSERT, UPDATE ON post_series TO kronaut_app;

ALTER TABLE posts ADD COLUMN series_id uuid;

ALTER TABLE posts ADD CONSTRAINT fk_posts_series FOREIGN KEY (workspace_id, series_id)
  REFERENCES post_series ON DELETE SET NULL (series_id) NOT VALID;

ALTER TABLE posts VALIDATE CONSTRAINT fk_posts_series;
