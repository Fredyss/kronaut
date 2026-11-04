CREATE INDEX CONCURRENTLY ix_rss_items_media_import ON rss_items (workspace_id, media_import_id)
  WHERE media_import_id IS NOT NULL;
