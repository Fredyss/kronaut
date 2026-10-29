CREATE INDEX CONCURRENTLY ix_posts_series ON posts (workspace_id, series_id) WHERE series_id IS NOT NULL;
