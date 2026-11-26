CREATE INDEX CONCURRENTLY ix_whd_due_v2 ON webhook_deliveries (next_attempt_at)
  WHERE state IN ('pending','retry_wait','delivering');
