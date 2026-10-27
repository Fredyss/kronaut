-- A grant edit must survive a later human save. Direct updates cannot clear agent_dirty;
-- recording a revision can, and that revision stays tainted.

BEGIN;

INSERT INTO organizations (id, name)
VALUES ('01900000-0000-7000-8000-000000000010', 'Guard Org');
INSERT INTO workspaces (id, organization_id, name, slug, timezone)
VALUES ('01900000-0000-7000-8000-000000000001', '01900000-0000-7000-8000-000000000010',
        'Guard', 'guard', 'Europe/Bratislava');

SET ROLE kronaut_app;
SELECT set_config('app.workspace_id', '01900000-0000-7000-8000-000000000001', true);
SELECT set_config('app.actor', 'grant:01900000-0000-7000-8000-0000000000aa', true);

INSERT INTO posts (workspace_id, id, origin)
VALUES ('01900000-0000-7000-8000-000000000001', '01900000-0000-7000-8000-000000000101', 'ui');
INSERT INTO post_variants (workspace_id, id, post_id, is_default)
VALUES ('01900000-0000-7000-8000-000000000001', '01900000-0000-7000-8000-000000000102',
        '01900000-0000-7000-8000-000000000101', true);
INSERT INTO variant_items (workspace_id, id, post_id, variant_id, position, role, doc, doc_schema_v)
VALUES ('01900000-0000-7000-8000-000000000001', '01900000-0000-7000-8000-000000000103',
        '01900000-0000-7000-8000-000000000101', '01900000-0000-7000-8000-000000000102',
        0, 'main', '{"type":"doc","text":"agent"}', 1);

DO $$
BEGIN
  IF NOT (SELECT agent_dirty FROM posts WHERE id = '01900000-0000-7000-8000-000000000101') THEN
    RAISE EXCEPTION 'grant edit did not mark the post';
  END IF;
END $$;

SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000000bb', true);
UPDATE posts SET title = 'Hello' WHERE id = '01900000-0000-7000-8000-000000000101';

DO $$
BEGIN
  UPDATE posts SET title = 'Changed', agent_dirty = false
   WHERE id = '01900000-0000-7000-8000-000000000101';
  RAISE EXCEPTION 'direct clear of agent_dirty was allowed';
EXCEPTION
  WHEN SQLSTATE 'KR005' THEN
    NULL;
END $$;

DO $$
DECLARE dirty boolean; title text;
BEGIN
  SELECT agent_dirty, posts.title INTO dirty, title
    FROM posts WHERE id = '01900000-0000-7000-8000-000000000101';
  IF NOT dirty OR title IS DISTINCT FROM 'Hello' THEN
    RAISE EXCEPTION 'rejected clear changed the post (dirty=%, title=%)', dirty, title;
  END IF;
END $$;

INSERT INTO post_revisions (workspace_id, post_id, post_version, snapshot, snapshot_v,
                             content_hash, content_hash_v, reason)
VALUES ('01900000-0000-7000-8000-000000000001', '01900000-0000-7000-8000-000000000101', 1,
        '{}', 1, decode(repeat('ab', 32), 'hex'), 1, 'checkpoint');
INSERT INTO revision_destinations (workspace_id, post_id, post_version, social_account_id,
                                   publish_type, variant_id, content_hash)
VALUES ('01900000-0000-7000-8000-000000000001', '01900000-0000-7000-8000-000000000101', 1,
        '01900000-0000-7000-8000-000000000104', 'post', '01900000-0000-7000-8000-000000000102',
        decode(repeat('cd', 32), 'hex'));

DO $$
DECLARE tainted boolean; dirty boolean; authored boolean;
BEGIN
  SELECT agent_tainted INTO tainted FROM post_revisions
   WHERE post_id = '01900000-0000-7000-8000-000000000101';
  SELECT agent_dirty INTO dirty FROM posts WHERE id = '01900000-0000-7000-8000-000000000101';
  SELECT agent_authored INTO authored FROM revision_destinations
   WHERE post_id = '01900000-0000-7000-8000-000000000101';
  IF tainted IS NOT TRUE OR dirty IS NOT FALSE OR authored IS NOT TRUE THEN
    RAISE EXCEPTION 'checkpoint did not keep agent authorship (tainted=%, dirty=%, authored=%)',
      tainted, dirty, authored;
  END IF;
END $$;

UPDATE posts SET agent_dirty = false WHERE id = '01900000-0000-7000-8000-000000000101';

SELECT set_config('app.actor', 'grant:01900000-0000-7000-8000-0000000000aa', true);
UPDATE variant_items SET doc = '{"type":"doc","text":"agent again"}'
 WHERE id = '01900000-0000-7000-8000-000000000103';

DO $$
BEGIN
  IF NOT (SELECT agent_dirty FROM posts WHERE id = '01900000-0000-7000-8000-000000000101') THEN
    RAISE EXCEPTION 'later grant edit did not mark the post';
  END IF;
  UPDATE posts SET agent_dirty = false WHERE id = '01900000-0000-7000-8000-000000000101';
  RAISE EXCEPTION 'second direct clear of agent_dirty was allowed';
EXCEPTION
  WHEN SQLSTATE 'KR005' THEN
    NULL;
END $$;

SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000000bb', true);
INSERT INTO posts (workspace_id, id, origin)
VALUES ('01900000-0000-7000-8000-000000000001', '01900000-0000-7000-8000-000000000201', 'ui');
INSERT INTO post_variants (workspace_id, id, post_id, is_default)
VALUES ('01900000-0000-7000-8000-000000000001', '01900000-0000-7000-8000-000000000202',
        '01900000-0000-7000-8000-000000000201', true);
INSERT INTO variant_items (workspace_id, id, post_id, variant_id, position, role, doc, doc_schema_v)
VALUES ('01900000-0000-7000-8000-000000000001', '01900000-0000-7000-8000-000000000203',
        '01900000-0000-7000-8000-000000000201', '01900000-0000-7000-8000-000000000202',
        0, 'main', '{"type":"doc","text":"human"}', 1);
INSERT INTO post_revisions (workspace_id, post_id, post_version, snapshot, snapshot_v,
                             content_hash, content_hash_v, reason)
VALUES ('01900000-0000-7000-8000-000000000001', '01900000-0000-7000-8000-000000000201', 1,
        '{}', 1, decode(repeat('ef', 32), 'hex'), 1, 'checkpoint');

DO $$
BEGIN
  IF (SELECT agent_tainted FROM post_revisions WHERE post_id = '01900000-0000-7000-8000-000000000201') THEN
    RAISE EXCEPTION 'human-only checkpoint was marked agent-tainted';
  END IF;
  IF (SELECT agent_dirty FROM posts WHERE id = '01900000-0000-7000-8000-000000000201') THEN
    RAISE EXCEPTION 'human-only post was left agent_dirty';
  END IF;
END $$;

RESET ROLE;
ROLLBACK;
