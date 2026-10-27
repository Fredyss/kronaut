-- The scheduling principal comes from app.actor: the user or grant that last scheduled or rescheduled the
-- destination. App input cannot set it, the worker cannot change it, and unscheduling clears it.

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

CREATE FUNCTION pg_temp.expect(label text, want text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE got text;
BEGIN
  SELECT coalesce('user:' || scheduled_by_user_id, 'grant:' || scheduled_by_grant_id, 'none') INTO got
    FROM post_destinations WHERE workspace_id = app_workspace_id() AND id = '01900000-0000-7000-8000-000000000641';
  IF got IS DISTINCT FROM want THEN RAISE EXCEPTION 'FAIL %: expected %, got %', label, want, got; END IF;
END $$;

CREATE FUNCTION pg_temp.schedule(local timestamp) RETURNS void LANGUAGE sql AS $$
  UPDATE post_destinations
     SET state = 'scheduled', version = version + 1,
         frozen_at = now(), frozen_post_version = 1, content_hash = decode(repeat('ab', 32), 'hex'),
         content_hash_v = 1, scheduled_local = local, scheduled_tz = 'Europe/Bratislava',
         scheduled_at = local AT TIME ZONE 'Europe/Bratislava', run_at = local AT TIME ZONE 'Europe/Bratislava',
         deadline_at = (local AT TIME ZONE 'Europe/Bratislava') + interval '1 hour'
   WHERE workspace_id = app_workspace_id() AND id = '01900000-0000-7000-8000-000000000641'
$$;

INSERT INTO organizations (id, name) VALUES ('01900000-0000-7000-8000-000000000610', 'Scheduler Org');
INSERT INTO workspaces (id, organization_id, name, slug, timezone)
VALUES ('01900000-0000-7000-8000-000000000601', '01900000-0000-7000-8000-000000000610',
        'Scheduler', 'scheduler', 'Europe/Bratislava');
INSERT INTO users (id, email, email_normalized, display_name, password_hash)
VALUES ('01900000-0000-7000-8000-0000000006a1', 'scheduler@x', 'scheduler@x', 'Scheduler', 'h');
INSERT INTO provider_apps (id, provider, instance_host, client_id)
VALUES ('01900000-0000-7000-8000-0000000006c1', 'bluesky', '', 'scheduler-app');
INSERT INTO social_accounts (workspace_id, id, provider, provider_app_id, provider_account_id,
                             account_kind, display_name)
VALUES ('01900000-0000-7000-8000-000000000601', '01900000-0000-7000-8000-0000000006d1', 'bluesky',
        '01900000-0000-7000-8000-0000000006c1', 'did:scheduler', 'profile', 'A');

SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000006a1', true);
INSERT INTO posts (workspace_id, id, origin)
VALUES ('01900000-0000-7000-8000-000000000601', '01900000-0000-7000-8000-000000000641', 'ui');
INSERT INTO post_revisions (workspace_id, post_id, post_version, snapshot, snapshot_v, content_hash,
                            content_hash_v, reason)
SELECT '01900000-0000-7000-8000-000000000601', '01900000-0000-7000-8000-000000000641', v, '{}', 1,
       decode(repeat('ab', 32), 'hex'), 1, 'schedule'
  FROM generate_series(1, 2) v;
INSERT INTO post_variants (workspace_id, id, post_id, is_default)
VALUES ('01900000-0000-7000-8000-000000000601', '01900000-0000-7000-8000-000000000641',
        '01900000-0000-7000-8000-000000000641', true);
INSERT INTO revision_destinations (workspace_id, post_id, post_version, social_account_id, publish_type,
                                   variant_id, content_hash)
SELECT '01900000-0000-7000-8000-000000000601', '01900000-0000-7000-8000-000000000641', v,
       '01900000-0000-7000-8000-0000000006d1', 'post', '01900000-0000-7000-8000-000000000641',
       decode(repeat('ab', 32), 'hex')
  FROM generate_series(1, 2) v;

SET ROLE kronaut_app;
SELECT set_config('app.workspace_id', '01900000-0000-7000-8000-000000000601', true);

INSERT INTO post_destinations (workspace_id, id, post_id, variant_id, social_account_id, provider,
                               publish_type, selection_source, account_label, scheduled_by_grant_id)
VALUES (app_workspace_id(), '01900000-0000-7000-8000-000000000641', '01900000-0000-7000-8000-000000000641',
        '01900000-0000-7000-8000-000000000641', '01900000-0000-7000-8000-0000000006d1', 'bluesky', 'post',
        'manual', 'A', '01900000-0000-7000-8000-0000000006b1');
SELECT pg_temp.expect('an insert cannot name a scheduler', 'none');

SELECT set_config('app.actor', 'system', true);
SELECT pg_temp.must_fail('the system cannot schedule a draft',
  $$SELECT pg_temp.schedule('2026-11-02 09:00')$$, '23514');

SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000006a1', true);
SELECT pg_temp.schedule('2026-11-02 09:00');
SELECT pg_temp.expect('the scheduling user', 'user:01900000-0000-7000-8000-0000000006a1');

UPDATE post_destinations SET scheduled_by_user_id = NULL, scheduled_by_grant_id = '01900000-0000-7000-8000-0000000006b1'
 WHERE id = '01900000-0000-7000-8000-000000000641';
SELECT pg_temp.expect('app input cannot change the scheduler', 'user:01900000-0000-7000-8000-0000000006a1');

SELECT set_config('app.actor', 'grant:01900000-0000-7000-8000-0000000006b1', true);
SELECT pg_temp.schedule('2026-11-02 10:00');
SELECT pg_temp.expect('a grant that reschedules takes over', 'grant:01900000-0000-7000-8000-0000000006b1');

SELECT set_config('app.actor', 'system', true);
UPDATE post_destinations SET run_at = now() WHERE id = '01900000-0000-7000-8000-000000000641';
UPDATE post_destinations SET state = 'blocked', state_reason = 'restore_quarantine', version = version + 1
 WHERE id = '01900000-0000-7000-8000-000000000641';
SELECT set_config('app.actor', 'cli', true);
UPDATE post_destinations SET state = 'scheduled', state_reason = NULL, version = version + 1,
       scheduled_at = scheduled_at + interval '1 minute'
 WHERE id = '01900000-0000-7000-8000-000000000641';
SELECT pg_temp.expect('a system or cli release keeps the scheduler', 'grant:01900000-0000-7000-8000-0000000006b1');

SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000006a1', true);
UPDATE post_destinations SET frozen_post_version = 2 WHERE id = '01900000-0000-7000-8000-000000000641';
SELECT pg_temp.expect('a re-freeze at the same time takes over', 'user:01900000-0000-7000-8000-0000000006a1');

SELECT set_config('app.actor', 'system', true);
UPDATE post_destinations
   SET state = 'publishing', version = version + 1, lease_until = now() + interval '120 seconds',
       claimed_attempt_id = gen_random_uuid()
 WHERE id = '01900000-0000-7000-8000-000000000641';
SELECT pg_temp.expect('the worker keeps the scheduler', 'user:01900000-0000-7000-8000-0000000006a1');

UPDATE post_destinations
   SET state = 'failed', state_reason = 'permanent_error', version = version + 1, lease_until = NULL,
       claimed_attempt_id = NULL
 WHERE id = '01900000-0000-7000-8000-000000000641';
SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000006a1', true);
UPDATE post_destinations SET state = 'draft', state_reason = 'unscheduled', version = version + 1
 WHERE id = '01900000-0000-7000-8000-000000000641';
SELECT pg_temp.expect('unscheduling clears the scheduler', 'none');

RESET ROLE;
ROLLBACK;
