CREATE TABLE tags (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  color text NOT NULL CHECK (color IN ('slate','red','orange','amber','green','teal','blue','violet')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id)
);

CREATE UNIQUE INDEX ux_tags_name ON tags (workspace_id, lower(name));

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON tags USING (workspace_id = app_workspace_id())
  WITH CHECK (workspace_id = app_workspace_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON tags TO kronaut_app;

CREATE TABLE post_tags (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  post_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  PRIMARY KEY (workspace_id, post_id, tag_id),
  FOREIGN KEY (workspace_id, post_id) REFERENCES posts ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, tag_id) REFERENCES tags ON DELETE CASCADE
);

CREATE INDEX ix_post_tags_tag ON post_tags (workspace_id, tag_id, post_id);

ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON post_tags USING (workspace_id = app_workspace_id())
  WITH CHECK (workspace_id = app_workspace_id());

GRANT SELECT, INSERT, DELETE ON post_tags TO kronaut_app;
