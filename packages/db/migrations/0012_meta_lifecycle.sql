ALTER TABLE social_accounts ADD COLUMN provider_subject_id text;

CREATE TABLE meta_lifecycle_requests (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  provider text NOT NULL CHECK (provider IN ('facebook','instagram','threads')),
  kind text NOT NULL CHECK (kind IN ('deletion','deauthorize')),
  received_at timestamptz NOT NULL DEFAULT now(),
  request_hash hash32 NOT NULL,
  subject_hmac hash32 NOT NULL,
  subject_id text,
  confirmation_code text UNIQUE CHECK (confirmation_code ~ '^[A-Z2-7]{20}$'),
  completed_at timestamptz,
  matched integer NOT NULL DEFAULT 0 CHECK (matched >= 0),
  CHECK ((kind = 'deletion') = (confirmation_code IS NOT NULL)),
  CHECK (completed_at IS NULL OR subject_id IS NULL),
  UNIQUE (provider, kind, request_hash)
);

CREATE INDEX ix_meta_lifecycle_completed ON meta_lifecycle_requests (completed_at)
  WHERE completed_at IS NOT NULL;

GRANT SELECT, INSERT, UPDATE (subject_id, completed_at, matched) ON meta_lifecycle_requests TO kronaut_app;

CREATE OR REPLACE FUNCTION purge_instance_retention(p_limit integer)
RETURNS TABLE (relation text, affected bigint)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE lim integer := least(greatest(p_limit, 0), 10000); n bigint;
BEGIN
  DELETE FROM sessions WHERE id IN (SELECT id FROM sessions
    WHERE expires_at < now() OR idle_expires_at < now() ORDER BY id LIMIT lim);
  GET DIAGNOSTICS n = ROW_COUNT; relation := 'sessions'; affected := n; RETURN NEXT;

  DELETE FROM security_events WHERE id IN (SELECT id FROM security_events
    WHERE occurred_at < now() - interval '400 days' ORDER BY occurred_at, id LIMIT lim);
  GET DIAGNOSTICS n = ROW_COUNT; relation := 'security_events'; affected := n; RETURN NEXT;

  UPDATE security_events SET ip_prefix = NULL WHERE id IN (SELECT id FROM security_events
    WHERE ip_prefix IS NOT NULL AND occurred_at < now() - interval '90 days' ORDER BY occurred_at, id LIMIT lim);
  GET DIAGNOSTICS n = ROW_COUNT; relation := 'security_events.ip_prefix'; affected := n; RETURN NEXT;

  DELETE FROM inbound_events WHERE (source, external_id) IN (SELECT source, external_id FROM inbound_events
    WHERE received_at < now() - interval '30 days' ORDER BY received_at, source, external_id LIMIT lim);
  GET DIAGNOSTICS n = ROW_COUNT; relation := 'inbound_events'; affected := n; RETURN NEXT;

  DELETE FROM ephemeral_kv WHERE key IN (SELECT key FROM ephemeral_kv
    WHERE expires_at < now() ORDER BY expires_at, key LIMIT lim);
  GET DIAGNOSTICS n = ROW_COUNT; relation := 'ephemeral_kv'; affected := n; RETURN NEXT;

  DELETE FROM rate_buckets WHERE key IN (SELECT key FROM rate_buckets
    WHERE updated_at < now() - interval '30 days' AND (blocked_until IS NULL OR blocked_until < now())
    ORDER BY updated_at, key LIMIT lim);
  GET DIAGNOSTICS n = ROW_COUNT; relation := 'rate_buckets'; affected := n; RETURN NEXT;

  DELETE FROM cron_runs WHERE id IN (SELECT id FROM cron_runs
    WHERE started_at < now() - interval '90 days' ORDER BY started_at, id LIMIT lim);
  GET DIAGNOSTICS n = ROW_COUNT; relation := 'cron_runs'; affected := n; RETURN NEXT;

  DELETE FROM worker_heartbeats WHERE seen_at < now() - interval '7 days';
  GET DIAGNOSTICS n = ROW_COUNT; relation := 'worker_heartbeats'; affected := n; RETURN NEXT;

  DELETE FROM meta_lifecycle_requests WHERE id IN (SELECT id FROM meta_lifecycle_requests
    WHERE completed_at < now() - interval '180 days' ORDER BY completed_at, id LIMIT lim);
  GET DIAGNOSTICS n = ROW_COUNT; relation := 'meta_lifecycle_requests'; affected := n; RETURN NEXT;
END $$;
