CREATE TABLE media_imports (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','fetching','done','failed')),
  url text CHECK (char_length(url) <= 2048),
  error text CHECK (error IN ('url_blocked','fetch_failed','timed_out','file_too_large','unsupported_type','file_corrupt','stalled')),
  media_id uuid,
  ai_generated boolean NOT NULL DEFAULT false,
  requested_by_user_id uuid, requested_by_grant_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  PRIMARY KEY (workspace_id, id),
  FOREIGN KEY (workspace_id, media_id) REFERENCES media_assets ON DELETE SET NULL (media_id),
  CHECK ((state IN ('pending','fetching')) = (url IS NOT NULL)),
  CHECK ((state IN ('done','failed')) = (finished_at IS NOT NULL)),
  CHECK ((state = 'failed') = (error IS NOT NULL))
);

CREATE INDEX ix_media_imports_open ON media_imports (workspace_id) WHERE state IN ('pending','fetching');

CREATE INDEX ix_media_imports_media ON media_imports (workspace_id, media_id) WHERE media_id IS NOT NULL;

ALTER TABLE media_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON media_imports USING (workspace_id = app_workspace_id())
  WITH CHECK (workspace_id = app_workspace_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON media_imports TO kronaut_app;

CREATE FUNCTION sweep_media_imports(p_limit integer)
RETURNS TABLE (workspace_id uuid, id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT i.workspace_id, i.id FROM media_imports i
   WHERE NOT instance_paused()
     AND ((i.state = 'pending' AND i.created_at < now() - interval '7 days')
       OR (i.state = 'fetching' AND i.updated_at < now() - interval '24 hours')
       OR i.finished_at < now() - interval '7 days')
   ORDER BY i.workspace_id, i.id LIMIT least(greatest(p_limit, 0), 1000)
$$;

REVOKE ALL ON FUNCTION sweep_media_imports(integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION sweep_media_imports(integer) TO kronaut_app;
