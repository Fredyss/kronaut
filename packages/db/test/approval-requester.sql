-- The requester is the acting principal and cannot approve their own request unless the live policy
-- and the request snapshot both allow it. The live policy's approval count is a floor, and reviewer
-- votes count on a request an agent opened.

BEGIN;

INSERT INTO organizations (id, name)
VALUES ('01900000-0000-7000-8000-000000000310', 'Approval Org');
INSERT INTO workspaces (id, organization_id, name, slug, timezone)
VALUES ('01900000-0000-7000-8000-000000000301', '01900000-0000-7000-8000-000000000310',
        'Approval', 'approval', 'Europe/Bratislava');
INSERT INTO users (id, email, email_normalized) VALUES
  ('01900000-0000-7000-8000-0000000003a1', 'requester@example.test', 'requester@example.test'),
  ('01900000-0000-7000-8000-0000000003b1', 'other@example.test', 'other@example.test');
INSERT INTO access_grants (workspace_id, id, kind, name, sponsor_user_id, scopes)
VALUES ('01900000-0000-7000-8000-000000000301', '01900000-0000-7000-8000-0000000003c1', 'api_key',
        'Agent', '01900000-0000-7000-8000-0000000003a1', ARRAY['posts:submit']);
INSERT INTO review_links (workspace_id, id, token_hash, invitee_email, can_decide, expires_at, created_by)
VALUES ('01900000-0000-7000-8000-000000000301', '01900000-0000-7000-8000-0000000003d1',
        decode(repeat('ef', 32), 'hex'), 'client@example.test', true, now() + interval '7 days',
        '01900000-0000-7000-8000-0000000003b1');
INSERT INTO brands (workspace_id, id, name, slug) VALUES
  ('01900000-0000-7000-8000-000000000301', '01900000-0000-7000-8000-000000000321', 'Solo', 'solo'),
  ('01900000-0000-7000-8000-000000000301', '01900000-0000-7000-8000-000000000322', 'Strict', 'strict'),
  ('01900000-0000-7000-8000-000000000301', '01900000-0000-7000-8000-000000000323', 'Plain', 'plain');
INSERT INTO approval_policies (workspace_id, brand_id, mode, required_approvals, allow_self_approval) VALUES
  ('01900000-0000-7000-8000-000000000301', NULL, 'required', 1, false),
  ('01900000-0000-7000-8000-000000000301', '01900000-0000-7000-8000-000000000321', 'required', 1, true),
  ('01900000-0000-7000-8000-000000000301', '01900000-0000-7000-8000-000000000322', 'required', 2, false);

SET ROLE kronaut_app;
SELECT set_config('app.workspace_id', '01900000-0000-7000-8000-000000000301', true);
SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000003a1', true);

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT * FROM (VALUES
    ('01900000-0000-7000-8000-000000000341'::uuid, NULL::uuid),
    ('01900000-0000-7000-8000-000000000342', '01900000-0000-7000-8000-000000000321'),
    ('01900000-0000-7000-8000-000000000343', '01900000-0000-7000-8000-000000000321'),
    ('01900000-0000-7000-8000-000000000344', '01900000-0000-7000-8000-000000000323'),
    ('01900000-0000-7000-8000-000000000345', '01900000-0000-7000-8000-000000000322'),
    ('01900000-0000-7000-8000-000000000346', NULL)) AS t(id, brand_id)
  LOOP
    INSERT INTO posts (workspace_id, id, brand_id, origin)
    VALUES (app_workspace_id(), p.id, p.brand_id, 'ui');
    INSERT INTO post_revisions (workspace_id, post_id, post_version, snapshot, snapshot_v,
                                content_hash, content_hash_v, reason)
    VALUES (app_workspace_id(), p.id, 1, '{}', 1, decode(repeat('ab', 32), 'hex'), 1, 'submit');
  END LOOP;
END $$;

DO $$
BEGIN
  INSERT INTO approval_requests (workspace_id, post_id, post_version, content_hash, content_hash_v,
                                 policy_snapshot, required_approvals, requested_by_user_id)
  VALUES (app_workspace_id(), '01900000-0000-7000-8000-000000000341', 1, decode(repeat('ab', 32), 'hex'),
          1, '{}', 1, '01900000-0000-7000-8000-0000000003b1');
  RAISE EXCEPTION 'a user opened a request in another user''s name';
EXCEPTION
  WHEN SQLSTATE 'KR006' THEN
    NULL;
END $$;

DO $$
BEGIN
  INSERT INTO approval_requests (workspace_id, post_id, post_version, content_hash, content_hash_v,
                                 policy_snapshot, required_approvals, requested_by_grant_id)
  VALUES (app_workspace_id(), '01900000-0000-7000-8000-000000000341', 1, decode(repeat('ab', 32), 'hex'),
          1, '{}', 1, '01900000-0000-7000-8000-0000000003c1');
  RAISE EXCEPTION 'a user opened a request in a grant''s name';
EXCEPTION
  WHEN SQLSTATE 'KR006' THEN
    NULL;
END $$;

DO $$
DECLARE actor text;
BEGIN
  FOREACH actor IN ARRAY ARRAY['reviewer:01900000-0000-7000-8000-0000000003d1', 'system', 'cli'] LOOP
    BEGIN
      PERFORM set_config('app.actor', actor, true);
      INSERT INTO approval_requests (workspace_id, post_id, post_version, content_hash, content_hash_v,
                                     policy_snapshot, required_approvals, requested_by_user_id)
      VALUES (app_workspace_id(), '01900000-0000-7000-8000-000000000341', 1,
              decode(repeat('ab', 32), 'hex'), 1, '{}', 1, '01900000-0000-7000-8000-0000000003a1');
      RAISE EXCEPTION '% opened a request', actor;
    EXCEPTION
      WHEN SQLSTATE 'KR006' THEN
        NULL;
    END;
  END LOOP;
  PERFORM set_config('app.actor', 'user:01900000-0000-7000-8000-0000000003a1', true);
END $$;

INSERT INTO approval_requests (workspace_id, id, post_id, post_version, content_hash, content_hash_v,
                               policy_snapshot, required_approvals, requested_by_user_id) VALUES
  (app_workspace_id(), '01900000-0000-7000-8000-000000000351', '01900000-0000-7000-8000-000000000341', 1,
   decode(repeat('ab', 32), 'hex'), 1, '{"allow_self_approval":true}', 1, '01900000-0000-7000-8000-0000000003a1'),
  (app_workspace_id(), '01900000-0000-7000-8000-000000000352', '01900000-0000-7000-8000-000000000342', 1,
   decode(repeat('ab', 32), 'hex'), 1, '{"allow_self_approval":true}', 1, '01900000-0000-7000-8000-0000000003a1'),
  (app_workspace_id(), '01900000-0000-7000-8000-000000000353', '01900000-0000-7000-8000-000000000343', 1,
   decode(repeat('ab', 32), 'hex'), 1, '{"allow_self_approval":false}', 1, '01900000-0000-7000-8000-0000000003a1'),
  (app_workspace_id(), '01900000-0000-7000-8000-000000000354', '01900000-0000-7000-8000-000000000344', 1,
   decode(repeat('ab', 32), 'hex'), 1, '{"allow_self_approval":true}', 1, '01900000-0000-7000-8000-0000000003a1'),
  (app_workspace_id(), '01900000-0000-7000-8000-000000000355', '01900000-0000-7000-8000-000000000345', 1,
   decode(repeat('ab', 32), 'hex'), 1, '{}', 1, '01900000-0000-7000-8000-0000000003a1');

INSERT INTO approval_decisions (workspace_id, request_id, decision, approver_kind, user_id, session_reauth_at)
SELECT app_workspace_id(), r.id, 'approve', 'user', '01900000-0000-7000-8000-0000000003a1', now()
  FROM (VALUES ('01900000-0000-7000-8000-000000000351'::uuid), ('01900000-0000-7000-8000-000000000352'),
               ('01900000-0000-7000-8000-000000000353'), ('01900000-0000-7000-8000-000000000354')) AS r(id);

DO $$
DECLARE r uuid;
BEGIN
  FOREACH r IN ARRAY ARRAY['01900000-0000-7000-8000-000000000351', '01900000-0000-7000-8000-000000000353',
                           '01900000-0000-7000-8000-000000000354']::uuid[] LOOP
    BEGIN
      UPDATE approval_requests SET state = 'approved', resolved_at = now() WHERE id = r;
      RAISE EXCEPTION 'requester approved % without policy and snapshot both allowing it', r;
    EXCEPTION
      WHEN SQLSTATE 'KR004' THEN
        NULL;
    END;
  END LOOP;
END $$;

UPDATE approval_requests SET state = 'approved', resolved_at = now()
 WHERE id = '01900000-0000-7000-8000-000000000352';

SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000003b1', true);
INSERT INTO approval_decisions (workspace_id, request_id, decision, approver_kind, user_id, session_reauth_at)
VALUES (app_workspace_id(), '01900000-0000-7000-8000-000000000351', 'approve', 'user',
        '01900000-0000-7000-8000-0000000003b1', now()),
       (app_workspace_id(), '01900000-0000-7000-8000-000000000355', 'approve', 'user',
        '01900000-0000-7000-8000-0000000003b1', now());
UPDATE approval_requests SET state = 'approved', resolved_at = now()
 WHERE id = '01900000-0000-7000-8000-000000000351';

DO $$
BEGIN
  UPDATE approval_requests SET state = 'approved', resolved_at = now()
   WHERE id = '01900000-0000-7000-8000-000000000355';
  RAISE EXCEPTION 'a request below the live policy''s approval count was approved';
EXCEPTION
  WHEN SQLSTATE 'KR004' THEN
    NULL;
END $$;

SELECT set_config('app.actor', 'grant:01900000-0000-7000-8000-0000000003c1', true);
INSERT INTO approval_requests (workspace_id, id, post_id, post_version, content_hash, content_hash_v,
                               policy_snapshot, required_approvals, requested_by_grant_id)
VALUES (app_workspace_id(), '01900000-0000-7000-8000-000000000356', '01900000-0000-7000-8000-000000000346', 1,
        decode(repeat('ab', 32), 'hex'), 1, '{}', 1, '01900000-0000-7000-8000-0000000003c1');

SELECT set_config('app.actor', 'reviewer:01900000-0000-7000-8000-0000000003d1', true);
INSERT INTO approval_decisions (workspace_id, request_id, decision, approver_kind, review_link_id,
                                reviewer_email, otp_verified_at)
VALUES (app_workspace_id(), '01900000-0000-7000-8000-000000000356', 'approve', 'reviewer',
        '01900000-0000-7000-8000-0000000003d1', 'client@example.test', now());
UPDATE approval_requests SET state = 'approved', resolved_at = now()
 WHERE id = '01900000-0000-7000-8000-000000000356';

DO $$
DECLARE approved uuid[];
BEGIN
  SELECT array_agg(id ORDER BY id) INTO approved FROM approval_requests WHERE state = 'approved';
  IF approved IS DISTINCT FROM ARRAY['01900000-0000-7000-8000-000000000351', '01900000-0000-7000-8000-000000000352',
                                     '01900000-0000-7000-8000-000000000356']::uuid[] THEN
    RAISE EXCEPTION 'unexpected approved requests: %', approved;
  END IF;
END $$;

RESET ROLE;
ROLLBACK;
