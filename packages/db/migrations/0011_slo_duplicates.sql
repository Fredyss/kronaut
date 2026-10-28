DROP FUNCTION slo_publish_stats(timestamptz, timestamptz);

-- Aggregates only, never ids: the admin page reads it without a tenant.
CREATE FUNCTION slo_publish_stats(p_from timestamptz, p_to timestamptz)
RETURNS TABLE (auto_total bigint, on_time bigint, unconfirmed bigint, provider_5xx bigint, duplicates bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_to <= p_from OR p_to - p_from > interval '31 days' THEN
    RAISE EXCEPTION 'window must be positive and at most 31 days' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  SELECT count(*),
         count(*) FILTER (WHERE d.published_at <= d.scheduled_at + interval '60 seconds'
                            AND NOT EXISTS (SELECT 1 FROM publish_attempts a
                                             WHERE a.workspace_id = d.workspace_id AND a.destination_id = d.id
                                               AND a.http_status BETWEEN 500 AND 599)),
         count(*) FILTER (WHERE d.state = 'unconfirmed'),
         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM publish_attempts a
                                         WHERE a.workspace_id = d.workspace_id AND a.destination_id = d.id
                                           AND a.http_status BETWEEN 500 AND 599)),
         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM publish_attempts a
                                         WHERE a.workspace_id = d.workspace_id AND a.destination_id = d.id
                                           AND a.kind = 'publish' AND a.outcome = 'ok'
                                         GROUP BY a.item_position HAVING count(*) > 1))
    FROM post_destinations d
   WHERE d.delivery_mode = 'auto' AND d.state NOT IN ('draft','canceled')
     AND d.scheduled_at >= p_from AND d.scheduled_at < p_to;
END $$;

REVOKE ALL ON FUNCTION slo_publish_stats(timestamptz, timestamptz) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION slo_publish_stats(timestamptz, timestamptz) TO kronaut_app;

GRANT EXECUTE ON FUNCTION slo_publish_stats(timestamptz, timestamptz) TO kronaut_operator;
