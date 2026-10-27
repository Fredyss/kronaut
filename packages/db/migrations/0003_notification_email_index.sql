CREATE INDEX CONCURRENTLY ix_notifications_unemailed ON notifications (workspace_id, created_at) WHERE emailed_at IS NULL;
