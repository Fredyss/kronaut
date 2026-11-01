ALTER TABLE worker_heartbeats ADD COLUMN job_session uuid;
ALTER TABLE worker_heartbeats ADD COLUMN job_pool_id text;

CREATE OR REPLACE FUNCTION sweep_media_gc(p_limit integer)
RETURNS TABLE (workspace_id uuid, media_asset_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT c.workspace_id, c.id FROM (
    SELECT m.workspace_id, m.id, 1 AS priority FROM media_assets m
     WHERE m.deleted_at < now() - interval '30 days' AND m.original_purged_at IS NULL
    UNION ALL
    SELECT m.workspace_id, m.id, 0 AS priority FROM media_assets m
     WHERE m.state = 'uploading' AND m.created_at < now() - interval '24 hours'
    UNION ALL
    SELECT m.workspace_id, m.id, 0 AS priority FROM media_assets m
     WHERE m.state = 'processing' AND m.updated_at < now() - interval '1 hour'
    UNION ALL
    SELECT r.workspace_id, r.media_asset_id, 1 AS priority FROM media_renditions r WHERE r.expires_at < now()
  ) c
   WHERE NOT instance_paused()
   GROUP BY c.workspace_id, c.id
   ORDER BY min(c.priority), c.workspace_id, c.id LIMIT least(greatest(p_limit, 0), 1000)
$$;
