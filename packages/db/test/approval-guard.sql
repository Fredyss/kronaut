-- Approval request guard: the caller-written policy snapshot cannot grant self-approval, reviewer votes count on
-- grant-opened requests, and a request can only name its acting user or grant as requester.

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

CREATE FUNCTION pg_temp.open_request(id uuid, post uuid, snapshot jsonb, by_user uuid, by_grant uuid) RETURNS void
LANGUAGE sql AS $$
  INSERT INTO approval_requests (workspace_id, id, post_id, post_version, content_hash, content_hash_v,
                                 policy_snapshot, required_approvals, requested_by_user_id, requested_by_grant_id)
  VALUES ('01900000-0000-7000-8000-000000000001', id, post, 1, decode(repeat('ab', 32), 'hex'), 1,
          snapshot, 1, by_user, by_grant)
$$;

CREATE FUNCTION pg_temp.approve_as_user(request uuid, u uuid) RETURNS void LANGUAGE sql AS $$
  INSERT INTO approval_decisions (workspace_id, request_id, decision, approver_kind, user_id, session_reauth_at)
  VALUES ('01900000-0000-7000-8000-000000000001', request, 'approve', 'user', u, now())
$$;

CREATE FUNCTION pg_temp.resolve(request uuid) RETURNS void LANGUAGE sql AS $$
  UPDATE approval_requests SET state = 'approved', resolved_at = now()
   WHERE workspace_id = '01900000-0000-7000-8000-000000000001' AND id = request
$$;

SET session_replication_role = replica;
INSERT INTO organizations (id, name) VALUES ('01900000-0000-7000-8000-000000000010', 'Approval Org');
INSERT INTO workspaces (id, organization_id, name, slug, timezone)
VALUES ('01900000-0000-7000-8000-000000000001', '01900000-0000-7000-8000-000000000010',
        'Approval', 'approval', 'Europe/Bratislava');
INSERT INTO users (id, email, email_normalized, display_name, password_hash) VALUES
  ('01900000-0000-7000-8000-0000000000b1', 'requester@x', 'requester@x', 'Requester', 'h'),
  ('01900000-0000-7000-8000-0000000000b2', 'other@x', 'other@x', 'Other', 'h');
INSERT INTO memberships (workspace_id, user_id, role, can_approve) VALUES
  ('01900000-0000-7000-8000-000000000001', '01900000-0000-7000-8000-0000000000b1', 'owner', true),
  ('01900000-0000-7000-8000-000000000001', '01900000-0000-7000-8000-0000000000b2', 'editor', true);
INSERT INTO access_grants (workspace_id, id, kind, name, sponsor_user_id, scopes)
VALUES ('01900000-0000-7000-8000-000000000001', '01900000-0000-7000-8000-0000000000a1', 'api_key', 'Agent',
        '01900000-0000-7000-8000-0000000000b1', ARRAY['posts:submit']);
INSERT INTO review_links (workspace_id, id, token_hash, invitee_email, can_decide, expires_at, created_by)
VALUES ('01900000-0000-7000-8000-000000000001', '01900000-0000-7000-8000-0000000000c1',
        decode(repeat('cd', 32), 'hex'), 'client@x', true, now() + interval '1 day',
        '01900000-0000-7000-8000-0000000000b1');
INSERT INTO brands (workspace_id, id, name, slug)
VALUES ('01900000-0000-7000-8000-000000000001', '01900000-0000-7000-8000-0000000000e1', 'Strict', 'strict');
INSERT INTO posts (workspace_id, id, brand_id, origin)
SELECT '01900000-0000-7000-8000-000000000001', ('01900000-0000-7000-8000-00000000010' || n)::uuid,
       CASE n WHEN 5 THEN '01900000-0000-7000-8000-0000000000e1'::uuid END, 'ui'
  FROM generate_series(1, 6) n;
INSERT INTO post_revisions (workspace_id, post_id, post_version, snapshot, snapshot_v, content_hash, content_hash_v,
                            reason)
SELECT workspace_id, id, 1, '{}', 1, decode(repeat('ab', 32), 'hex'), 1, 'submit' FROM posts;
INSERT INTO approval_policies (workspace_id, brand_id, mode, allow_self_approval) VALUES
  ('01900000-0000-7000-8000-000000000001', NULL, 'required', false),
  ('01900000-0000-7000-8000-000000000001', '01900000-0000-7000-8000-0000000000e1', 'required', false);
SET session_replication_role = origin;

SET ROLE kronaut_app;
SELECT set_config('app.workspace_id', '01900000-0000-7000-8000-000000000001', true);

SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000000b1', true);
SELECT pg_temp.must_fail('a user cannot name another user as requester',
  $$SELECT pg_temp.open_request(gen_random_uuid(), '01900000-0000-7000-8000-000000000106', '{}',
                                '01900000-0000-7000-8000-0000000000b2', NULL)$$, 'KR006');
SELECT pg_temp.must_fail('a user cannot open a request in a grant''s name',
  $$SELECT pg_temp.open_request(gen_random_uuid(), '01900000-0000-7000-8000-000000000106', '{}',
                                NULL, '01900000-0000-7000-8000-0000000000a1')$$, 'KR006');

SELECT pg_temp.open_request('01900000-0000-7000-8000-000000000201', '01900000-0000-7000-8000-000000000101',
                            '{"allow_self_approval": true}', '01900000-0000-7000-8000-0000000000b1', NULL);
SELECT pg_temp.approve_as_user('01900000-0000-7000-8000-000000000201', '01900000-0000-7000-8000-0000000000b1');
SELECT pg_temp.must_fail('a snapshot cannot grant self-approval the live policy denies',
  $$SELECT pg_temp.resolve('01900000-0000-7000-8000-000000000201')$$, 'KR004');

SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000000b2', true);
SELECT pg_temp.approve_as_user('01900000-0000-7000-8000-000000000201', '01900000-0000-7000-8000-0000000000b2');
SELECT pg_temp.resolve('01900000-0000-7000-8000-000000000201');

UPDATE approval_policies SET allow_self_approval = true WHERE brand_id IS NULL;
SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000000b1', true);

SELECT pg_temp.open_request('01900000-0000-7000-8000-000000000202', '01900000-0000-7000-8000-000000000102',
                            '{"allow_self_approval": true}', '01900000-0000-7000-8000-0000000000b1', NULL);
SELECT pg_temp.approve_as_user('01900000-0000-7000-8000-000000000202', '01900000-0000-7000-8000-0000000000b1');
SELECT pg_temp.resolve('01900000-0000-7000-8000-000000000202');

SELECT pg_temp.open_request('01900000-0000-7000-8000-000000000203', '01900000-0000-7000-8000-000000000103',
                            '{"allow_self_approval": false}', '01900000-0000-7000-8000-0000000000b1', NULL);
SELECT pg_temp.approve_as_user('01900000-0000-7000-8000-000000000203', '01900000-0000-7000-8000-0000000000b1');
SELECT pg_temp.must_fail('a live loosening does not widen a stricter snapshot',
  $$SELECT pg_temp.resolve('01900000-0000-7000-8000-000000000203')$$, 'KR004');

SELECT pg_temp.open_request('01900000-0000-7000-8000-000000000205', '01900000-0000-7000-8000-000000000105',
                            '{"allow_self_approval": true}', '01900000-0000-7000-8000-0000000000b1', NULL);
SELECT pg_temp.approve_as_user('01900000-0000-7000-8000-000000000205', '01900000-0000-7000-8000-0000000000b1');
SELECT pg_temp.must_fail('a stricter brand policy overrides the workspace policy',
  $$SELECT pg_temp.resolve('01900000-0000-7000-8000-000000000205')$$, 'KR004');

SELECT pg_temp.open_request('01900000-0000-7000-8000-000000000206', '01900000-0000-7000-8000-000000000106',
                            '{"allow_self_approval": "yes"}', '01900000-0000-7000-8000-0000000000b1', NULL);
SELECT pg_temp.approve_as_user('01900000-0000-7000-8000-000000000206', '01900000-0000-7000-8000-0000000000b1');
SELECT pg_temp.must_fail('a non-boolean snapshot flag counts as no self-approval',
  $$SELECT pg_temp.resolve('01900000-0000-7000-8000-000000000206')$$, 'KR004');
SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000000b2', true);
SELECT pg_temp.approve_as_user('01900000-0000-7000-8000-000000000206', '01900000-0000-7000-8000-0000000000b2');
SELECT pg_temp.resolve('01900000-0000-7000-8000-000000000206');

SELECT set_config('app.actor', 'grant:01900000-0000-7000-8000-0000000000a1', true);
SELECT pg_temp.open_request('01900000-0000-7000-8000-000000000204', '01900000-0000-7000-8000-000000000104',
                            '{}', NULL, '01900000-0000-7000-8000-0000000000a1');

SELECT set_config('app.actor', 'reviewer:01900000-0000-7000-8000-0000000000c1', true);
SELECT pg_temp.must_fail('a reviewer cannot open a request',
  $$SELECT pg_temp.open_request(gen_random_uuid(), '01900000-0000-7000-8000-000000000106', '{}',
                                '01900000-0000-7000-8000-0000000000b1', NULL)$$, 'KR006');
INSERT INTO approval_decisions (workspace_id, request_id, decision, approver_kind, review_link_id, reviewer_email,
                                otp_verified_at)
VALUES ('01900000-0000-7000-8000-000000000001', '01900000-0000-7000-8000-000000000204', 'approve', 'reviewer',
        '01900000-0000-7000-8000-0000000000c1', 'client@x', now());
SELECT pg_temp.resolve('01900000-0000-7000-8000-000000000204');

DO $$
BEGIN
  IF (SELECT array_agg(state ORDER BY id) FROM approval_requests) IS DISTINCT FROM
     ARRAY['approved','approved','open','approved','open','approved'] THEN
    RAISE EXCEPTION 'unexpected request states: %', (SELECT array_agg(state ORDER BY id) FROM approval_requests);
  END IF;
END $$;

RESET ROLE;
ROLLBACK;
