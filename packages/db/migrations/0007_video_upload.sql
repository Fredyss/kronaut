ALTER TABLE media_assets
  ADD COLUMN rejected_reason text,
  ADD COLUMN duplicate_of_id uuid,
  ADD COLUMN upload_expires_at timestamptz;

ALTER TABLE media_assets ADD CONSTRAINT ck_media_assets_rejected_reason
  CHECK (rejected_reason IN ('video_stream_missing','video_too_short','video_too_long',
                             'video_unreadable','video_too_large','video_duplicate')) NOT VALID;

ALTER TABLE media_assets ADD CONSTRAINT ck_media_assets_rejected_state
  CHECK (rejected_reason IS NULL OR state = 'rejected') NOT VALID;

ALTER TABLE media_assets ADD CONSTRAINT fk_media_assets_duplicate_of
  FOREIGN KEY (workspace_id, duplicate_of_id) REFERENCES media_assets
  ON DELETE SET NULL (duplicate_of_id) NOT VALID;

ALTER TABLE media_assets VALIDATE CONSTRAINT ck_media_assets_rejected_reason;

ALTER TABLE media_assets VALIDATE CONSTRAINT ck_media_assets_rejected_state;

ALTER TABLE media_assets VALIDATE CONSTRAINT fk_media_assets_duplicate_of;

-- Expired uploads sort first so the other candidates can't crowd them out of the limit (ADR-0054).
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
    SELECT r.workspace_id, r.media_asset_id, 1 AS priority FROM media_renditions r WHERE r.expires_at < now()
  ) c
   WHERE NOT instance_paused()
   GROUP BY c.workspace_id, c.id
   ORDER BY min(c.priority), c.workspace_id, c.id LIMIT least(greatest(p_limit, 0), 1000)
$$;

REVOKE ALL ON FUNCTION sweep_media_gc(integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION sweep_media_gc(integer) TO kronaut_app;
