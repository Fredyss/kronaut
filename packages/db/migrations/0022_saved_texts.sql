CREATE TABLE saved_texts (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  doc jsonb NOT NULL CHECK (octet_length(doc::text) <= 65536),
  doc_schema_v smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id)
);

CREATE UNIQUE INDEX ux_saved_texts_name ON saved_texts (workspace_id, lower(name));

ALTER TABLE saved_texts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON saved_texts USING (workspace_id = app_workspace_id())
  WITH CHECK (workspace_id = app_workspace_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON saved_texts TO kronaut_app;
