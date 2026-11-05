CREATE INDEX CONCURRENTLY ix_dest_source_group ON post_destinations (workspace_id, source_group_id) WHERE source_group_id IS NOT NULL;
