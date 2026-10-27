-- tolerance_min is caller-written. It may only narrow the live policy (brand override, else the
-- workspace policy). With no policy the default is 0. The column cap also stops a value that would
-- overflow approved_tolerance_min * 60 in the schedule-binding check.

BEGIN;

CREATE FUNCTION pg_temp.must_fail(label text, stmt text, code text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = code THEN RETURN; END IF;
    RAISE EXCEPTION 'FAIL %: expected %, got % %', label, code, SQLSTATE, SQLERRM;
  END;
  RAISE EXCEPTION 'FAIL %: expected %, no error', label, code;
END $$;

CREATE FUNCTION pg_temp.bound(request uuid, destination uuid, tolerance integer) RETURNS void
LANGUAGE sql AS $$
  INSERT INTO approval_request_destinations (workspace_id, request_id, destination_id, content_hash,
                                              schedule_bound, shown_local, shown_tz, tolerance_min)
  VALUES (app_workspace_id(), request, destination, decode(repeat('ab', 32), 'hex'),
          true, '2026-11-02 09:00', 'Europe/Bratislava', tolerance)
$$;

INSERT INTO organizations (id, name) VALUES ('01900000-0000-7000-8000-000000000410', 'Tolerance Org');
INSERT INTO workspaces (id, organization_id, name, slug, timezone) VALUES
  ('01900000-0000-7000-8000-000000000401', '01900000-0000-7000-8000-000000000410',
   'Tolerance', 'tolerance', 'Europe/Bratislava'),
  ('01900000-0000-7000-8000-000000000402', '01900000-0000-7000-8000-000000000410',
   'No Policy', 'no-policy', 'Europe/Bratislava');
INSERT INTO users (id, email, email_normalized, display_name, password_hash)
VALUES ('01900000-0000-7000-8000-0000000004a1', 'requester@x', 'requester@x', 'Requester', 'h');
INSERT INTO brands (workspace_id, id, name, slug) VALUES
  ('01900000-0000-7000-8000-000000000401', '01900000-0000-7000-8000-0000000004e1', 'Loose', 'loose'),
  ('01900000-0000-7000-8000-000000000401', '01900000-0000-7000-8000-0000000004e2', 'Strict', 'strict');
INSERT INTO approval_policies (workspace_id, brand_id, mode, reschedule_tolerance_min) VALUES
  ('01900000-0000-7000-8000-000000000401', NULL, 'required', 10),
  ('01900000-0000-7000-8000-000000000401', '01900000-0000-7000-8000-0000000004e1', 'required', 30),
  ('01900000-0000-7000-8000-000000000401', '01900000-0000-7000-8000-0000000004e2', 'required', 0);
INSERT INTO provider_apps (id, provider, instance_host, client_id)
VALUES ('01900000-0000-7000-8000-0000000004c1', 'bluesky', '', 'tolerance-app');
INSERT INTO social_accounts (workspace_id, id, provider, provider_app_id, provider_account_id,
                             account_kind, display_name) VALUES
  ('01900000-0000-7000-8000-000000000401', '01900000-0000-7000-8000-0000000004d1', 'bluesky',
   '01900000-0000-7000-8000-0000000004c1', 'did:tolerance', 'profile', 'A'),
  ('01900000-0000-7000-8000-000000000402', '01900000-0000-7000-8000-0000000004d2', 'bluesky',
   '01900000-0000-7000-8000-0000000004c1', 'did:no-policy', 'profile', 'B');

SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000004a1', true);

INSERT INTO posts (workspace_id, id, brand_id, origin) VALUES
  ('01900000-0000-7000-8000-000000000401', '01900000-0000-7000-8000-000000000441', NULL, 'ui'),
  ('01900000-0000-7000-8000-000000000401', '01900000-0000-7000-8000-000000000442',
   '01900000-0000-7000-8000-0000000004e1', 'ui'),
  ('01900000-0000-7000-8000-000000000401', '01900000-0000-7000-8000-000000000443',
   '01900000-0000-7000-8000-0000000004e2', 'ui'),
  ('01900000-0000-7000-8000-000000000402', '01900000-0000-7000-8000-000000000448', NULL, 'ui');

INSERT INTO post_revisions (workspace_id, post_id, post_version, snapshot, snapshot_v, content_hash,
                            content_hash_v, reason)
SELECT workspace_id, id, 1, '{}', 1, decode(repeat('ab', 32), 'hex'), 1, 'submit' FROM posts;

INSERT INTO post_variants (workspace_id, id, post_id, is_default)
SELECT workspace_id, id, id, true FROM posts;

INSERT INTO post_destinations (workspace_id, id, post_id, variant_id, social_account_id, provider,
                               publish_type, selection_source, account_label) VALUES
  ('01900000-0000-7000-8000-000000000401', '01900000-0000-7000-8000-000000000441',
   '01900000-0000-7000-8000-000000000441', '01900000-0000-7000-8000-000000000441',
   '01900000-0000-7000-8000-0000000004d1', 'bluesky', 'post', 'manual', 'A'),
  ('01900000-0000-7000-8000-000000000401', '01900000-0000-7000-8000-000000000442',
   '01900000-0000-7000-8000-000000000442', '01900000-0000-7000-8000-000000000442',
   '01900000-0000-7000-8000-0000000004d1', 'bluesky', 'post', 'manual', 'A'),
  ('01900000-0000-7000-8000-000000000401', '01900000-0000-7000-8000-000000000443',
   '01900000-0000-7000-8000-000000000443', '01900000-0000-7000-8000-000000000443',
   '01900000-0000-7000-8000-0000000004d1', 'bluesky', 'post', 'manual', 'A'),
  ('01900000-0000-7000-8000-000000000401', '01900000-0000-7000-8000-000000000445',
   '01900000-0000-7000-8000-000000000442', '01900000-0000-7000-8000-000000000442',
   '01900000-0000-7000-8000-0000000004d1', 'bluesky', 'thread', 'manual', 'A'),
  ('01900000-0000-7000-8000-000000000401', '01900000-0000-7000-8000-000000000449',
   '01900000-0000-7000-8000-000000000441', '01900000-0000-7000-8000-000000000441',
   '01900000-0000-7000-8000-0000000004d1', 'bluesky', 'comment', 'manual', 'A'),
  ('01900000-0000-7000-8000-000000000401', '01900000-0000-7000-8000-000000000450',
   '01900000-0000-7000-8000-000000000441', '01900000-0000-7000-8000-000000000441',
   '01900000-0000-7000-8000-0000000004d1', 'bluesky', 'story', 'manual', 'A'),
  ('01900000-0000-7000-8000-000000000402', '01900000-0000-7000-8000-000000000448',
   '01900000-0000-7000-8000-000000000448', '01900000-0000-7000-8000-000000000448',
   '01900000-0000-7000-8000-0000000004d2', 'bluesky', 'post', 'manual', 'B');

SET ROLE kronaut_app;
SELECT set_config('app.workspace_id', '01900000-0000-7000-8000-000000000401', true);
SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000004a1', true);

INSERT INTO approval_requests (workspace_id, id, post_id, post_version, content_hash, content_hash_v,
                               policy_snapshot, required_approvals, requested_by_user_id)
SELECT workspace_id, id, id, 1, decode(repeat('ab', 32), 'hex'), 1, '{}', 1,
       '01900000-0000-7000-8000-0000000004a1'
  FROM posts
 WHERE workspace_id = app_workspace_id();

SELECT pg_temp.must_fail('workspace policy: a week of slack is wider than 10 minutes',
  $$SELECT pg_temp.bound('01900000-0000-7000-8000-000000000441', '01900000-0000-7000-8000-000000000441', 10080)$$,
  'KR004');
SELECT pg_temp.must_fail('workspace policy: one minute over the live window',
  $$SELECT pg_temp.bound('01900000-0000-7000-8000-000000000441', '01900000-0000-7000-8000-000000000441', 11)$$,
  'KR004');
SELECT pg_temp.must_fail('negative tolerance is rejected',
  $$SELECT pg_temp.bound('01900000-0000-7000-8000-000000000441', '01900000-0000-7000-8000-000000000450', -1)$$,
  '23514');
SELECT pg_temp.bound('01900000-0000-7000-8000-000000000441', '01900000-0000-7000-8000-000000000441', 10);

SELECT pg_temp.must_fail('brand policy: the looser workspace window does not apply',
  $$SELECT pg_temp.bound('01900000-0000-7000-8000-000000000443', '01900000-0000-7000-8000-000000000443', 10)$$,
  'KR004');
SELECT pg_temp.bound('01900000-0000-7000-8000-000000000443', '01900000-0000-7000-8000-000000000443', 0);

SELECT pg_temp.bound('01900000-0000-7000-8000-000000000442', '01900000-0000-7000-8000-000000000442', 0);
SELECT pg_temp.must_fail('brand policy: wider than the brand window',
  $$SELECT pg_temp.bound('01900000-0000-7000-8000-000000000442', '01900000-0000-7000-8000-000000000445', 31)$$,
  'KR004');
SELECT pg_temp.bound('01900000-0000-7000-8000-000000000442', '01900000-0000-7000-8000-000000000445', 30);

INSERT INTO approval_request_destinations (workspace_id, request_id, destination_id, content_hash,
                                           schedule_bound)
VALUES (app_workspace_id(), '01900000-0000-7000-8000-000000000441', '01900000-0000-7000-8000-000000000449',
        decode(repeat('ab', 32), 'hex'), false);

SELECT set_config('app.workspace_id', '01900000-0000-7000-8000-000000000402', true);
INSERT INTO approval_requests (workspace_id, id, post_id, post_version, content_hash, content_hash_v,
                               policy_snapshot, required_approvals, requested_by_user_id)
VALUES (app_workspace_id(), '01900000-0000-7000-8000-000000000448', '01900000-0000-7000-8000-000000000448',
        1, decode(repeat('ab', 32), 'hex'), 1, '{}', 1, '01900000-0000-7000-8000-0000000004a1');
SELECT pg_temp.must_fail('no policy: the default window is 0',
  $$SELECT pg_temp.bound('01900000-0000-7000-8000-000000000448', '01900000-0000-7000-8000-000000000448', 1)$$,
  'KR004');
SELECT pg_temp.bound('01900000-0000-7000-8000-000000000448', '01900000-0000-7000-8000-000000000448', 0);

RESET ROLE;
SET session_replication_role = replica;
SELECT pg_temp.must_fail('column cap rejects a tolerance that would overflow the schedule check',
  $$INSERT INTO approval_request_destinations (workspace_id, request_id, destination_id, content_hash,
       schedule_bound, shown_local, shown_tz, tolerance_min)
    VALUES ('01900000-0000-7000-8000-000000000401', '01900000-0000-7000-8000-000000000441',
            '01900000-0000-7000-8000-000000000499', decode(repeat('cd', 32), 'hex'),
            true, '2026-11-02 09:00', 'Europe/Bratislava', 2147483647)$$,
  '23514');
SET session_replication_role = origin;

DO $$
BEGIN
  IF (SELECT array_agg(tolerance_min ORDER BY destination_id) FROM approval_request_destinations)
       IS DISTINCT FROM ARRAY[10, 0, 0, 30, 0, NULL] THEN
    RAISE EXCEPTION 'unexpected tolerances: %',
      (SELECT array_agg(tolerance_min ORDER BY destination_id) FROM approval_request_destinations);
  END IF;
END $$;

ROLLBACK;
