CREATE INDEX CONCURRENTLY ix_whd_endpoint ON webhook_deliveries (workspace_id, endpoint_id, id);
