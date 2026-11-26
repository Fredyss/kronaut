-- A claim moves next_attempt_at to the end of its lease, so a delivering row past it was interrupted mid-send and
-- is due again (ADR-0069).
CREATE OR REPLACE FUNCTION sweep_due_webhook_deliveries(p_limit integer)
RETURNS TABLE (workspace_id uuid, delivery_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT d.workspace_id, d.id FROM webhook_deliveries d
   WHERE d.state IN ('pending','retry_wait','delivering') AND d.next_attempt_at <= now() AND NOT instance_paused()
   ORDER BY d.next_attempt_at, d.workspace_id, d.id LIMIT least(greatest(p_limit, 0), 1000)
$$;
