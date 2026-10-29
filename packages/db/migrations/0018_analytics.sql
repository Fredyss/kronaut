CREATE TABLE post_metric_snapshots (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  destination_id uuid NOT NULL,
  metric text NOT NULL CHECK (metric IN ('likes','reposts','replies','quotes','comments','shares',
    'reactions','bookmarks','views')),
  value bigint CHECK (value >= 0),
  observed_at timestamptz NOT NULL,
  provider text NOT NULL,
  api_version text NOT NULL,
  PRIMARY KEY (workspace_id, destination_id, metric, observed_at),
  FOREIGN KEY (workspace_id, destination_id) REFERENCES post_destinations ON DELETE CASCADE
);

ALTER TABLE post_metric_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON post_metric_snapshots USING (workspace_id = app_workspace_id())
  WITH CHECK (workspace_id = app_workspace_id());

GRANT SELECT, INSERT ON post_metric_snapshots TO kronaut_app;

CREATE TABLE account_daily_metrics (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  social_account_id uuid NOT NULL,
  day date NOT NULL,
  metric text NOT NULL CHECK (metric IN ('followers')),
  value bigint CHECK (value >= 0),
  observed_at timestamptz NOT NULL,
  provider text NOT NULL,
  api_version text NOT NULL,
  PRIMARY KEY (workspace_id, social_account_id, metric, day),
  FOREIGN KEY (workspace_id, social_account_id) REFERENCES social_accounts ON DELETE CASCADE
);

ALTER TABLE account_daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON account_daily_metrics USING (workspace_id = app_workspace_id())
  WITH CHECK (workspace_id = app_workspace_id());

GRANT SELECT, INSERT ON account_daily_metrics TO kronaut_app;

CREATE TABLE destination_metric_pulls (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  destination_id uuid NOT NULL,
  step smallint NOT NULL CHECK (step BETWEEN 0 AND 5),
  next_pull_at timestamptz,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  PRIMARY KEY (workspace_id, destination_id),
  FOREIGN KEY (workspace_id, destination_id) REFERENCES post_destinations ON DELETE CASCADE
);

CREATE INDEX ix_destination_metric_pulls_due
  ON destination_metric_pulls (workspace_id, next_pull_at) WHERE next_pull_at IS NOT NULL;

ALTER TABLE destination_metric_pulls ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON destination_metric_pulls USING (workspace_id = app_workspace_id())
  WITH CHECK (workspace_id = app_workspace_id());

GRANT SELECT, INSERT, UPDATE ON destination_metric_pulls TO kronaut_app;

CREATE TABLE account_metric_pulls (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  social_account_id uuid NOT NULL,
  checked_on date,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  PRIMARY KEY (workspace_id, social_account_id),
  FOREIGN KEY (workspace_id, social_account_id) REFERENCES social_accounts ON DELETE CASCADE
);

ALTER TABLE account_metric_pulls ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON account_metric_pulls USING (workspace_id = app_workspace_id())
  WITH CHECK (workspace_id = app_workspace_id());

GRANT SELECT, INSERT, UPDATE ON account_metric_pulls TO kronaut_app;
