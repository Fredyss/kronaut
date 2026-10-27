-- posts.publish_summary is derived from the post's destinations and open approval request by trigger.
-- settle_seq counts the times the post entered a completed_* summary. App input to either is ignored.

BEGIN;

CREATE FUNCTION pg_temp.expect(label text, post uuid, want text, want_seq integer) RETURNS void LANGUAGE plpgsql AS $$
DECLARE got text; seq integer;
BEGIN
  SELECT publish_summary, settle_seq INTO got, seq FROM posts WHERE workspace_id = app_workspace_id() AND id = post;
  IF (got, seq) IS DISTINCT FROM (want, want_seq) THEN
    RAISE EXCEPTION 'FAIL %: expected % #%, got % #%', label, want, want_seq, got, seq;
  END IF;
END $$;

CREATE FUNCTION pg_temp.schedule(dest uuid) RETURNS void LANGUAGE sql AS $$
  UPDATE post_destinations
     SET state = 'scheduled', state_reason = NULL, version = version + 1,
         frozen_at = coalesce(frozen_at, now()), frozen_post_version = 1, content_hash = decode(repeat('ab', 32), 'hex'),
         content_hash_v = 1, scheduled_local = '2026-11-02 09:00', scheduled_tz = 'Europe/Bratislava',
         scheduled_at = '2026-11-02 09:00' AT TIME ZONE 'Europe/Bratislava',
         run_at = '2026-11-02 09:00' AT TIME ZONE 'Europe/Bratislava',
         deadline_at = ('2026-11-02 09:00' AT TIME ZONE 'Europe/Bratislava') + interval '1 hour'
   WHERE workspace_id = app_workspace_id() AND id = dest
$$;

CREATE FUNCTION pg_temp.go(dest uuid, to_state text, reason text) RETURNS void LANGUAGE sql AS $$
  UPDATE post_destinations
     SET state = to_state, state_reason = reason, version = version + 1,
         lease_until = CASE WHEN to_state = 'publishing' THEN now() + interval '120 seconds' END,
         claimed_attempt_id = CASE WHEN to_state = 'publishing' THEN gen_random_uuid() END,
         published_at = CASE WHEN to_state = 'published' THEN now() END,
         resolution = CASE WHEN to_state = 'published' THEN 'api' END,
         remote_id = CASE WHEN to_state = 'published' THEN 'at://remote/' || dest END
   WHERE workspace_id = app_workspace_id() AND id = dest
$$;

INSERT INTO organizations (id, name) VALUES ('01900000-0000-7000-8000-000000000710', 'Summary Org');
INSERT INTO workspaces (id, organization_id, name, slug, timezone)
VALUES ('01900000-0000-7000-8000-000000000701', '01900000-0000-7000-8000-000000000710',
        'Summary', 'summary', 'Europe/Bratislava');
INSERT INTO users (id, email, email_normalized, display_name, password_hash)
VALUES ('01900000-0000-7000-8000-0000000007a1', 'summary@x', 'summary@x', 'Summary', 'h');
INSERT INTO provider_apps (id, provider, instance_host, client_id)
VALUES ('01900000-0000-7000-8000-0000000007c1', 'bluesky', '', 'summary-app');
INSERT INTO social_accounts (workspace_id, id, provider, provider_app_id, provider_account_id,
                             account_kind, display_name)
SELECT '01900000-0000-7000-8000-000000000701', a, 'bluesky', '01900000-0000-7000-8000-0000000007c1',
       'did:' || a, 'profile', 'A'
  FROM unnest(ARRAY['01900000-0000-7000-8000-0000000007d1', '01900000-0000-7000-8000-0000000007d2']::uuid[]) a;

SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000007a1', true);
INSERT INTO posts (workspace_id, id, origin, publish_summary, settle_seq) VALUES
  ('01900000-0000-7000-8000-000000000701', '01900000-0000-7000-8000-000000000741', 'ui', 'completed_all', 5),
  ('01900000-0000-7000-8000-000000000701', '01900000-0000-7000-8000-000000000742', 'ui', 'draft', 0);
INSERT INTO post_revisions (workspace_id, post_id, post_version, snapshot, snapshot_v, content_hash,
                            content_hash_v, reason)
VALUES ('01900000-0000-7000-8000-000000000701', '01900000-0000-7000-8000-000000000741', 1, '{}', 1,
        decode(repeat('ab', 32), 'hex'), 1, 'schedule');
INSERT INTO post_variants (workspace_id, id, post_id, is_default) VALUES
  ('01900000-0000-7000-8000-000000000701', '01900000-0000-7000-8000-000000000741',
   '01900000-0000-7000-8000-000000000741', true),
  ('01900000-0000-7000-8000-000000000701', '01900000-0000-7000-8000-000000000742',
   '01900000-0000-7000-8000-000000000742', true);
INSERT INTO revision_destinations (workspace_id, post_id, post_version, social_account_id, publish_type,
                                   variant_id, content_hash)
SELECT '01900000-0000-7000-8000-000000000701', '01900000-0000-7000-8000-000000000741', 1, a, 'post',
       '01900000-0000-7000-8000-000000000741', decode(repeat('ab', 32), 'hex')
  FROM unnest(ARRAY['01900000-0000-7000-8000-0000000007d1', '01900000-0000-7000-8000-0000000007d2']::uuid[]) a;

SET ROLE kronaut_app;
SELECT set_config('app.workspace_id', '01900000-0000-7000-8000-000000000701', true);

SELECT pg_temp.expect('an insert cannot name a summary', '01900000-0000-7000-8000-000000000741', 'draft', 0);

INSERT INTO post_destinations (workspace_id, id, post_id, variant_id, social_account_id, provider,
                               publish_type, selection_source, account_label)
SELECT app_workspace_id(), d, '01900000-0000-7000-8000-000000000741', '01900000-0000-7000-8000-000000000741',
       a, 'bluesky', 'post', 'manual', 'A'
  FROM (VALUES ('01900000-0000-7000-8000-000000000751'::uuid, '01900000-0000-7000-8000-0000000007d1'::uuid),
               ('01900000-0000-7000-8000-000000000752', '01900000-0000-7000-8000-0000000007d2')) v (d, a);
SELECT pg_temp.expect('drafts', '01900000-0000-7000-8000-000000000741', 'draft', 0);

INSERT INTO approval_requests (workspace_id, id, post_id, post_version, content_hash, content_hash_v,
                               policy_snapshot, required_approvals, requested_by_user_id)
VALUES (app_workspace_id(), '01900000-0000-7000-8000-000000000761', '01900000-0000-7000-8000-000000000741', 1,
        decode(repeat('ab', 32), 'hex'), 1, '{}', 1, '01900000-0000-7000-8000-0000000007a1');
SELECT pg_temp.expect('an open request', '01900000-0000-7000-8000-000000000741', 'in_review', 0);
UPDATE approval_requests SET state = 'withdrawn', resolved_at = now()
 WHERE id = '01900000-0000-7000-8000-000000000761';
SELECT pg_temp.expect('a withdrawn request', '01900000-0000-7000-8000-000000000741', 'draft', 0);

SELECT pg_temp.schedule('01900000-0000-7000-8000-000000000751');
SELECT pg_temp.expect('one scheduled, one draft', '01900000-0000-7000-8000-000000000741', 'scheduled', 0);

SELECT set_config('app.actor', 'system', true);
SELECT pg_temp.go('01900000-0000-7000-8000-000000000751', 'publishing', NULL);
SELECT pg_temp.expect('publishing', '01900000-0000-7000-8000-000000000741', 'in_progress', 0);
SELECT pg_temp.go('01900000-0000-7000-8000-000000000751', 'published', NULL);
SELECT pg_temp.expect('published beside a draft', '01900000-0000-7000-8000-000000000741', 'in_progress', 0);

UPDATE posts SET publish_summary = 'canceled', settle_seq = 9 WHERE id = '01900000-0000-7000-8000-000000000741';
SELECT pg_temp.expect('app input cannot change the summary', '01900000-0000-7000-8000-000000000741',
  'in_progress', 0);

SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000007a1', true);
SELECT pg_temp.schedule('01900000-0000-7000-8000-000000000752');
SELECT set_config('app.actor', 'system', true);
SELECT pg_temp.go('01900000-0000-7000-8000-000000000752', 'publishing', NULL);
SELECT pg_temp.go('01900000-0000-7000-8000-000000000752', 'failed', 'permanent_error');
SELECT pg_temp.expect('one published, one failed', '01900000-0000-7000-8000-000000000741',
  'completed_partial', 1);

SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000007a1', true);
SELECT pg_temp.schedule('01900000-0000-7000-8000-000000000752');
SELECT pg_temp.expect('rescheduled after failing', '01900000-0000-7000-8000-000000000741', 'in_progress', 1);
SELECT set_config('app.actor', 'system', true);
SELECT pg_temp.go('01900000-0000-7000-8000-000000000752', 'publishing', NULL);
SELECT pg_temp.go('01900000-0000-7000-8000-000000000752', 'unconfirmed', 'ambiguous_response');
SELECT pg_temp.expect('an unconfirmed send', '01900000-0000-7000-8000-000000000741', 'needs_action', 1);

SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000007a1', true);
SELECT pg_temp.schedule('01900000-0000-7000-8000-000000000752');
SELECT set_config('app.actor', 'system', true);
SELECT pg_temp.go('01900000-0000-7000-8000-000000000752', 'publishing', NULL);
SELECT pg_temp.go('01900000-0000-7000-8000-000000000752', 'published', NULL);
SELECT pg_temp.expect('all published', '01900000-0000-7000-8000-000000000741', 'completed_all', 2);

SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000007a1', true);
INSERT INTO post_destinations (workspace_id, id, post_id, variant_id, social_account_id, provider,
                               publish_type, selection_source, account_label)
VALUES (app_workspace_id(), '01900000-0000-7000-8000-000000000753', '01900000-0000-7000-8000-000000000742',
        '01900000-0000-7000-8000-000000000742', '01900000-0000-7000-8000-0000000007d1', 'bluesky', 'post',
        'manual', 'A');
SELECT pg_temp.go('01900000-0000-7000-8000-000000000753', 'canceled', 'user_canceled');
SELECT pg_temp.expect('every destination canceled', '01900000-0000-7000-8000-000000000742', 'canceled', 0);
DELETE FROM post_destinations WHERE id = '01900000-0000-7000-8000-000000000753';
SELECT pg_temp.expect('no destinations left', '01900000-0000-7000-8000-000000000742', 'draft', 0);

RESET ROLE;
ROLLBACK;
