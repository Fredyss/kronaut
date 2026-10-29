CREATE TABLE queue_slots (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  social_account_id uuid NOT NULL,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  local_time time NOT NULL CHECK (local_time = date_trunc('minute', local_time)),
  timezone iana_tz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, social_account_id, weekday, local_time),
  FOREIGN KEY (workspace_id, social_account_id) REFERENCES social_accounts ON DELETE CASCADE
);

ALTER TABLE queue_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON queue_slots USING (workspace_id = app_workspace_id())
  WITH CHECK (workspace_id = app_workspace_id());

GRANT SELECT, INSERT, DELETE ON queue_slots TO kronaut_app;
