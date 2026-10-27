-- Seed for the concurrent-finalize test: one post with two destinations, both publishing.

BEGIN;

INSERT INTO organizations (id, name) VALUES ('01900000-0000-7000-8000-000000000810', 'Race Org');
INSERT INTO workspaces (id, organization_id, name, slug, timezone)
VALUES ('01900000-0000-7000-8000-000000000801', '01900000-0000-7000-8000-000000000810',
        'Race', 'race', 'Europe/Bratislava');
INSERT INTO users (id, email, email_normalized, display_name, password_hash)
VALUES ('01900000-0000-7000-8000-0000000008a1', 'race@x', 'race@x', 'Race', 'h');
INSERT INTO provider_apps (id, provider, instance_host, client_id)
VALUES ('01900000-0000-7000-8000-0000000008c1', 'bluesky', '', 'race-app');
INSERT INTO social_accounts (workspace_id, id, provider, provider_app_id, provider_account_id,
                             account_kind, display_name)
SELECT '01900000-0000-7000-8000-000000000801', a, 'bluesky', '01900000-0000-7000-8000-0000000008c1',
       'did:' || a, 'profile', 'A'
  FROM unnest(ARRAY['01900000-0000-7000-8000-0000000008d1', '01900000-0000-7000-8000-0000000008d2']::uuid[]) a;
SELECT set_config('app.actor', 'user:01900000-0000-7000-8000-0000000008a1', true);
INSERT INTO posts (workspace_id, id, origin)
VALUES ('01900000-0000-7000-8000-000000000801', '01900000-0000-7000-8000-000000000841', 'ui');
INSERT INTO post_revisions (workspace_id, post_id, post_version, snapshot, snapshot_v, content_hash,
                            content_hash_v, reason)
VALUES ('01900000-0000-7000-8000-000000000801', '01900000-0000-7000-8000-000000000841', 1, '{}', 1,
        decode(repeat('ab', 32), 'hex'), 1, 'schedule');
INSERT INTO post_variants (workspace_id, id, post_id, is_default)
VALUES ('01900000-0000-7000-8000-000000000801', '01900000-0000-7000-8000-000000000841',
        '01900000-0000-7000-8000-000000000841', true);
INSERT INTO revision_destinations (workspace_id, post_id, post_version, social_account_id, publish_type,
                                   variant_id, content_hash)
SELECT '01900000-0000-7000-8000-000000000801', '01900000-0000-7000-8000-000000000841', 1, a, 'post',
       '01900000-0000-7000-8000-000000000841', decode(repeat('ab', 32), 'hex')
  FROM unnest(ARRAY['01900000-0000-7000-8000-0000000008d1', '01900000-0000-7000-8000-0000000008d2']::uuid[]) a;

SET ROLE kronaut_app;
SELECT set_config('app.workspace_id', '01900000-0000-7000-8000-000000000801', true);
INSERT INTO post_destinations (workspace_id, id, post_id, variant_id, social_account_id, provider,
                               publish_type, selection_source, account_label)
SELECT app_workspace_id(), d, '01900000-0000-7000-8000-000000000841', '01900000-0000-7000-8000-000000000841',
       a, 'bluesky', 'post', 'manual', 'A'
  FROM (VALUES ('01900000-0000-7000-8000-000000000851'::uuid, '01900000-0000-7000-8000-0000000008d1'::uuid),
               ('01900000-0000-7000-8000-000000000852', '01900000-0000-7000-8000-0000000008d2')) v (d, a);
UPDATE post_destinations
   SET state = 'scheduled', version = version + 1,
       frozen_at = now(), frozen_post_version = 1, content_hash = decode(repeat('ab', 32), 'hex'),
       content_hash_v = 1, scheduled_local = '2026-11-02 09:00', scheduled_tz = 'Europe/Bratislava',
       scheduled_at = '2026-11-02 09:00' AT TIME ZONE 'Europe/Bratislava',
       run_at = '2026-11-02 09:00' AT TIME ZONE 'Europe/Bratislava',
       deadline_at = ('2026-11-02 09:00' AT TIME ZONE 'Europe/Bratislava') + interval '1 hour'
 WHERE workspace_id = app_workspace_id();
SELECT set_config('app.actor', 'system', true);
UPDATE post_destinations
   SET state = 'publishing', version = version + 1, lease_until = now() + interval '120 seconds',
       claimed_attempt_id = gen_random_uuid()
 WHERE workspace_id = app_workspace_id();
RESET ROLE;

COMMIT;
