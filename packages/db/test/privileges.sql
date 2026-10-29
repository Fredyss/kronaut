-- Privilege and cross-tenant entry point tests (ADR-0056; TEN-04..07). Run as a superuser against a database
-- loaded from schema/v1.sql. Everything happens in one transaction that is rolled back; any failure raises.
\set ON_ERROR_STOP 1
\o /dev/null
BEGIN;

CREATE FUNCTION pg_temp.must(label text, ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL %', label; END IF;
END $$;

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

CREATE FUNCTION pg_temp.grants(r regrole) RETURNS TABLE (relname name, privs text) LANGUAGE sql AS $$
  SELECT c.relname, concat_ws(',',
           (SELECT string_agg(a.privilege_type, ',' ORDER BY a.privilege_type)
              FROM aclexplode(c.relacl) a WHERE a.grantee = r),
           (SELECT string_agg(x.privilege_type || '(' || att.attname || ')', ',' ORDER BY x.privilege_type, att.attname)
              FROM pg_attribute att, aclexplode(att.attacl) x WHERE att.attrelid = c.oid AND x.grantee = r))
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND NOT c.relispartition
     AND NOT EXISTS (SELECT 1 FROM pg_attribute a
                      WHERE a.attrelid = c.oid AND a.attname = 'workspace_id' AND NOT a.attisdropped)
$$;

-- TEN-04: every global table is default-deny; only the grants ADR-0056 lists exist.
CREATE TEMP TABLE expected_app (relname name, privs text);
INSERT INTO expected_app VALUES
  ('cron_runs', 'INSERT,SELECT,UPDATE'),
  ('deletion_receipts', 'INSERT'),
  ('destination_state_reasons', 'SELECT'),
  ('destination_transitions', 'SELECT'),
  ('entitlement_overrides', 'SELECT'),
  ('ephemeral_kv', 'DELETE,INSERT,SELECT,UPDATE'),
  ('inbound_events', 'INSERT,SELECT,UPDATE(processed_at)'),
  ('instance_state', 'SELECT'),
  ('meta_lifecycle_requests', 'INSERT,SELECT,UPDATE(completed_at),UPDATE(matched),UPDATE(subject_id)'),
  ('organizations', 'SELECT,UPDATE(name)'),
  ('provider_app_incidents', 'INSERT,SELECT,UPDATE'),
  ('provider_app_keys', 'SELECT'),
  ('provider_apps', 'INSERT,SELECT,UPDATE(last_verified_at),UPDATE(status)'),
  ('rate_buckets', 'INSERT,SELECT,UPDATE'),
  ('security_events', 'INSERT,SELECT'),
  ('sessions', 'DELETE,INSERT,SELECT,UPDATE(idle_expires_at),UPDATE(reauthenticated_at)'),
  ('usage_counters', 'INSERT,SELECT,UPDATE'),
  ('users', 'SELECT,UPDATE(display_name),UPDATE(display_timezone),UPDATE(email),UPDATE(email_normalized),'
            'UPDATE(erased_at),UPDATE(password_hash),UPDATE(totp_kek_version),UPDATE(totp_last_step),'
            'UPDATE(totp_nonce),UPDATE(totp_secret_ciphertext),UPDATE(totp_wrapped_dek),UPDATE(ui_locale)'),
  ('worker_heartbeats', 'INSERT,SELECT,UPDATE'),
  ('workspaces', 'DELETE,SELECT,UPDATE(default_language),UPDATE(deletion_requested_at),UPDATE(name),'
                 'UPDATE(slug),UPDATE(timezone)');
CREATE TEMP TABLE expected_operator (relname name, privs text);
INSERT INTO expected_operator VALUES
  ('cron_runs', 'SELECT'),
  ('deletion_receipts', 'SELECT'),
  ('entitlement_overrides', 'DELETE,INSERT,SELECT,UPDATE'),
  ('instance_state', 'SELECT'),
  ('organizations', 'SELECT'),
  ('provider_app_incidents', 'SELECT,UPDATE(resolved_at)'),
  ('provider_app_keys', 'DELETE,INSERT,SELECT,UPDATE'),
  ('provider_apps', 'DELETE,INSERT,SELECT,UPDATE'),
  ('worker_heartbeats', 'SELECT');

SELECT pg_temp.must('TEN-04 app grant on ' || coalesce(g.relname, e.relname) || ': got ' || coalesce(g.privs, '')
                    || ', expected ' || coalesce(e.privs, ''), false)
  FROM pg_temp.grants('kronaut_app') g FULL JOIN expected_app e USING (relname)
 WHERE coalesce(g.privs, '') <> coalesce(e.privs, '');
SELECT pg_temp.must('TEN-04 operator grant on ' || coalesce(g.relname, e.relname) || ': got ' || coalesce(g.privs, '')
                    || ', expected ' || coalesce(e.privs, ''), false)
  FROM pg_temp.grants('kronaut_operator') g FULL JOIN expected_operator e USING (relname)
 WHERE coalesce(g.privs, '') <> coalesce(e.privs, '');
SELECT pg_temp.must('TEN-04 operator has no tenant-table privilege on ' || c.relname, false)
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
   AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attname = 'workspace_id')
   AND has_table_privilege('kronaut_operator', c.oid, 'SELECT,INSERT,UPDATE,DELETE');
SELECT pg_temp.must('TEN-04 no privilege for PUBLIC on ' || c.relname, false)
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, aclexplode(c.relacl) a
 WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND a.grantee = 0;
SELECT pg_temp.must('TEN-04 queue_slots: tenant policy, app may only read, insert and delete',
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'queue_slots'::regclass)
  AND EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'queue_slots'::regclass AND polname = 'tenant_isolation')
  AND (SELECT string_agg(a.privilege_type, ',' ORDER BY a.privilege_type)
         FROM pg_class c, aclexplode(c.relacl) a
        WHERE c.oid = 'queue_slots'::regclass AND a.grantee = 'kronaut_app'::regrole) = 'DELETE,INSERT,SELECT');
SELECT pg_temp.must('TEN-04 post_series: tenant policy, app may only read, insert and update',
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'post_series'::regclass)
  AND EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'post_series'::regclass AND polname = 'tenant_isolation')
  AND (SELECT string_agg(a.privilege_type, ',' ORDER BY a.privilege_type)
         FROM pg_class c, aclexplode(c.relacl) a
        WHERE c.oid = 'post_series'::regclass AND a.grantee = 'kronaut_app'::regrole) = 'INSERT,SELECT,UPDATE');

-- TEN-05: the SECURITY DEFINER allowlist, pinned search_path, and EXECUTE per role.
CREATE TEMP TABLE expected_definer (fn text, app boolean, operator boolean);
INSERT INTO expected_definer VALUES
  ('auth_lookup_grant_token(bytea)', true, false),
  ('auth_lookup_review_link(bytea)', true, false),
  ('auth_lookup_session(bytea)', true, false),
  ('auth_login_lookup(text)', true, false),
  ('auth_create_user(text,text,text,text,text)', true, false),
  ('auth_user_workspaces(uuid)', true, false),
  ('workspace_member_profiles()', true, false),
  ('provision_organization(text,text,text,text)', true, false),
  ('provision_workspace(uuid,text,text,text)', true, false),
  ('instance_fence(uuid)', true, false),
  ('instance_pause()', false, true),
  ('instance_mark_restored()', false, true),
  ('instance_release(uuid)', false, true),
  ('sweep_due_destinations(integer)', true, false),
  ('sweep_expired_leases(integer)', true, false),
  ('sweep_verifying_destinations(integer)', true, false),
  ('sweep_quarantine_destinations(integer)', true, false),
  ('sweep_expiring_credentials(interval,integer)', true, false),
  ('sweep_due_webhook_deliveries(integer)', true, false),
  ('sweep_media_gc(integer)', true, false),
  ('sweep_workspaces(uuid,integer)', true, false),
  ('purge_instance_retention(integer)', true, false),
  ('maintain_audit_partitions(integer)', true, false),
  ('slo_publish_stats(timestamp with time zone,timestamp with time zone)', true, true);

CREATE TEMP VIEW actual_definer AS
  SELECT p.oid, p.oid::regprocedure::text AS fn, p.proconfig, p.proacl
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prosecdef;

SELECT pg_temp.must('TEN-05 definer not on allowlist: ' || coalesce(a.fn, e.fn), false)
  FROM actual_definer a FULL JOIN expected_definer e USING (fn)
 WHERE a.fn IS NULL OR e.fn IS NULL;
SELECT pg_temp.must('TEN-05 search_path not pinned: ' || fn, false)
  FROM actual_definer WHERE NOT coalesce(proconfig @> ARRAY['search_path=public, pg_temp'], false);
SELECT pg_temp.must('TEN-05 PUBLIC can execute ' || fn, false)
  FROM actual_definer a, aclexplode(coalesce(a.proacl, acldefault('f', 10))) x WHERE x.grantee = 0;
SELECT pg_temp.must('TEN-05 EXECUTE mismatch on ' || e.fn, false)
  FROM actual_definer a JOIN expected_definer e USING (fn)
 WHERE has_function_privilege('kronaut_app', a.oid, 'EXECUTE') <> e.app
    OR has_function_privilege('kronaut_operator', a.oid, 'EXECUTE') <> e.operator;
SELECT pg_temp.must('TEN-06 sweep returns more than ids: ' || p.oid::regprocedure::text, false)
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname LIKE 'sweep\_%'
   AND EXISTS (SELECT 1 FROM unnest(p.proallargtypes, p.proargmodes) AS t(typ, mode)
                WHERE mode = 't' AND typ <> 'uuid'::regtype);
SELECT pg_temp.must('TEN-04 invoker function names an unqualified relation: '
                    || p.oid::regprocedure::text || ' -> ' || c.relname, false)
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace,
       pg_class c JOIN pg_namespace cn ON cn.oid = c.relnamespace
 WHERE n.nspname = 'public' AND NOT p.prosecdef AND p.prosqlbody IS NULL
   AND cn.nspname = 'public' AND c.relkind IN ('r','p','v','m','S')
   AND p.prosrc ~* ('(from|join|update|into)\s+' || c.relname || '\M');

-- Seed. Triggers and FK checks are off for seeding only, so rows can be placed directly in any state.
SET session_replication_role = replica;
\set A1 '''00000000-0000-7000-8000-0000000000a1'''
\set A2 '''00000000-0000-7000-8000-0000000000a2'''
\set B1 '''00000000-0000-7000-8000-0000000000b1'''
\set B2 '''00000000-0000-7000-8000-0000000000b2'''
\set B3 '''00000000-0000-7000-8000-0000000000b3'''
\set U1 '''00000000-0000-7000-8000-000000000001'''
\set U2 '''00000000-0000-7000-8000-000000000002'''
\set U3 '''00000000-0000-7000-8000-000000000003'''

INSERT INTO organizations (id, name) VALUES (:A1, 'Org one'), (:A2, 'Org two');
INSERT INTO workspaces (id, organization_id, name, slug, timezone) VALUES
  (:B1, :A1, 'WS1', 'ws1', 'Europe/Bratislava'), (:B2, :A1, 'WS2', 'ws2', 'Europe/Prague'),
  (:B3, :A2, 'WS3', 'ws3', 'Europe/Vienna');
INSERT INTO users (id, email, email_normalized, display_name, password_hash) VALUES
  (:U1, 'a@x', 'a@x', 'A', 'h1'), (:U2, 'b@x', 'b@x', 'B', 'h2'), (:U3, 'c@x', 'c@x', 'C', 'h3');
INSERT INTO users (id, erased_at) VALUES ('00000000-0000-7000-8000-000000000009', now());
INSERT INTO memberships (workspace_id, user_id, role, can_approve) VALUES
  (:B1, :U1, 'owner', true), (:B2, :U1, 'owner', true), (:B1, :U2, 'editor', false), (:B3, :U3, 'owner', true);
INSERT INTO sessions (id, token_hash, user_id, expires_at, idle_expires_at, reauthenticated_at) VALUES
  ('00000000-0000-7000-8000-000000000501', decode(repeat('51', 32), 'hex'), :U1, now() + interval '1 day', now() + interval '1 hour', now()),
  ('00000000-0000-7000-8000-000000000502', decode(repeat('52', 32), 'hex'), :U2, now() + interval '1 day', now() + interval '1 hour', now()),
  ('00000000-0000-7000-8000-000000000503', decode(repeat('53', 32), 'hex'), :U1, now() - interval '1 minute', now() + interval '1 hour', now());
INSERT INTO security_events (user_id, kind) VALUES (:U1, 'auth.login'), (:U2, 'auth.login');
INSERT INTO meta_lifecycle_requests (provider, kind, request_hash, subject_hmac, confirmation_code, completed_at) VALUES
  ('facebook', 'deletion', decode(repeat('61', 32), 'hex'), decode(repeat('60', 32), 'hex'), repeat('A', 20), now() - interval '181 days'),
  ('threads', 'deletion', decode(repeat('62', 32), 'hex'), decode(repeat('60', 32), 'hex'), repeat('B', 20), now() - interval '179 days');
INSERT INTO meta_lifecycle_requests (provider, kind, request_hash, subject_hmac, subject_id, received_at) VALUES
  ('instagram', 'deauthorize', decode(repeat('63', 32), 'hex'), decode(repeat('60', 32), 'hex'), '1', now() - interval '31 days'),
  ('facebook', 'deauthorize', decode(repeat('64', 32), 'hex'), decode(repeat('60', 32), 'hex'), '2', now() - interval '29 days');
INSERT INTO entitlement_overrides (organization_id, key, value) VALUES (:A1, 'seats', '5'), (:A2, 'seats', '50');
INSERT INTO provider_apps (id, provider, instance_host, client_id) VALUES
  ('00000000-0000-7000-8000-0000000000c1', 'bluesky', '', 'x'),
  ('00000000-0000-7000-8000-0000000000c2', 'mastodon', 'mastodon.example', 'y');
INSERT INTO social_accounts (workspace_id, id, provider, provider_app_id, provider_account_id, account_kind, display_name, status) VALUES
  (:B1, '00000000-0000-7000-8000-0000000000d1', 'bluesky', '00000000-0000-7000-8000-0000000000c1', 'did:1', 'profile', 'A', 'active'),
  (:B2, '00000000-0000-7000-8000-0000000000d2', 'bluesky', '00000000-0000-7000-8000-0000000000c1', 'did:2', 'profile', 'B', 'active'),
  (:B2, '00000000-0000-7000-8000-0000000000d3', 'bluesky', '00000000-0000-7000-8000-0000000000c1', 'did:3', 'profile', 'C', 'needs_reauth');

CREATE FUNCTION pg_temp.dest(ws uuid, id uuid, st text, run timestamptz) RETURNS void LANGUAGE sql AS $$
  INSERT INTO post_destinations (workspace_id, id, post_id, social_account_id, provider, publish_type,
    selection_source, account_label, state, state_reason, version, frozen_at, frozen_post_version, content_hash,
    content_hash_v, scheduled_local, scheduled_tz, scheduled_at, deadline_at, run_at, lease_until, claimed_attempt_id,
    scheduled_by_user_id)
  VALUES (ws, id, gen_random_uuid(), gen_random_uuid(), 'bluesky', 'post', 'manual', 'A', st,
    CASE st WHEN 'verifying' THEN 'send_outcome_unknown' END, 2, now(), 1, decode(repeat('aa', 32), 'hex'), 1,
    '2026-11-02 09:00', 'Europe/Bratislava', run, run + interval '6 hours',
    CASE WHEN st IN ('scheduled','retry_wait') THEN run END,
    CASE WHEN st = 'publishing' THEN run END, CASE WHEN st = 'publishing' THEN gen_random_uuid() END,
    gen_random_uuid())
$$;
SELECT pg_temp.dest(:B2, '00000000-0000-7000-8000-000000000211', 'scheduled', now() - interval '3 hours');
SELECT pg_temp.dest(:B1, '00000000-0000-7000-8000-000000000212', 'retry_wait', now() - interval '2 hours');
SELECT pg_temp.dest(:B2, '00000000-0000-7000-8000-000000000213', 'scheduled', now() - interval '1 hour');
SELECT pg_temp.dest(:B1, '00000000-0000-7000-8000-000000000214', 'scheduled', now() - interval '1 hour');
SELECT pg_temp.dest(:B1, '00000000-0000-7000-8000-000000000215', 'scheduled', now() + interval '1 hour');
SELECT pg_temp.dest(:B1, '00000000-0000-7000-8000-000000000221', 'publishing', now() - interval '5 minutes');
SELECT pg_temp.dest(:B2, '00000000-0000-7000-8000-000000000222', 'publishing', now() - interval '10 minutes');
SELECT pg_temp.dest(:B2, '00000000-0000-7000-8000-000000000223', 'publishing', now() + interval '2 minutes');
SELECT pg_temp.dest(:B1, '00000000-0000-7000-8000-000000000231', 'verifying', now());
SELECT pg_temp.dest(:B2, '00000000-0000-7000-8000-000000000232', 'verifying', now());

INSERT INTO account_credentials (workspace_id, id, social_account_id, kind, ciphertext, nonce, wrapped_dek, kek_version,
                                 access_expires_at, refresh_lease_until, refresh_lease_owner) VALUES
  (:B1, '00000000-0000-7000-8000-000000000301', '00000000-0000-7000-8000-0000000000d1', 'oauth', '\x00', '\x00', '\x00', 1, now() + interval '1 hour', NULL, NULL),
  (:B2, '00000000-0000-7000-8000-000000000302', '00000000-0000-7000-8000-0000000000d2', 'oauth', '\x00', '\x00', '\x00', 1, now() + interval '2 days', NULL, NULL),
  (:B2, '00000000-0000-7000-8000-000000000303', '00000000-0000-7000-8000-0000000000d3', 'oauth', '\x00', '\x00', '\x00', 1, now() + interval '1 hour', NULL, NULL),
  (:B1, '00000000-0000-7000-8000-000000000304', '00000000-0000-7000-8000-0000000000d1', 'page_token', '\x00', '\x00', '\x00', 1, now() + interval '1 hour', now() + interval '1 minute', 'w1'),
  (:B2, '00000000-0000-7000-8000-000000000305', '00000000-0000-7000-8000-0000000000d2', 'page_token', '\x00', '\x00', '\x00', 1, now() + interval '30 days', NULL, NULL);

INSERT INTO webhook_deliveries (workspace_id, id, endpoint_id, event_id, state, next_attempt_at) VALUES
  (:B1, '00000000-0000-7000-8000-000000000401', gen_random_uuid(), gen_random_uuid(), 'pending', now() - interval '1 minute'),
  (:B2, '00000000-0000-7000-8000-000000000402', gen_random_uuid(), gen_random_uuid(), 'retry_wait', now() - interval '2 minutes'),
  (:B2, '00000000-0000-7000-8000-000000000403', gen_random_uuid(), gen_random_uuid(), 'delivered', now() - interval '3 minutes'),
  (:B2, '00000000-0000-7000-8000-000000000404', gen_random_uuid(), gen_random_uuid(), 'pending', now() + interval '1 minute');

INSERT INTO media_assets (workspace_id, id, kind, state, storage_key, deleted_at, created_at) VALUES
  (:B1, '00000000-0000-7000-8000-000000000601', 'image', 'quarantined', repeat('1', 64), now() - interval '31 days', now() - interval '40 days'),
  (:B2, '00000000-0000-7000-8000-000000000602', 'image', 'uploading', repeat('2', 64), NULL, now() - interval '8 days'),
  (:B2, '00000000-0000-7000-8000-000000000603', 'image', 'quarantined', repeat('3', 64), NULL, now()),
  (:B1, '00000000-0000-7000-8000-000000000604', 'image', 'quarantined', repeat('4', 64), now() - interval '1 day', now()),
  (:B3, '00000000-0000-7000-8000-000000000605', 'image', 'uploading', repeat('5', 64), NULL, now() - interval '23 hours');
INSERT INTO media_renditions (workspace_id, media_asset_id, purpose, transform_hash, storage_key, sha256, mime, bytes, expires_at) VALUES
  (:B1, '00000000-0000-7000-8000-000000000601', 'publish', decode(repeat('01', 32), 'hex'), 'r1', decode(repeat('01', 32), 'hex'), 'image/jpeg', 1, now() - interval '1 hour'),
  (:B2, '00000000-0000-7000-8000-000000000603', 'publish', decode(repeat('02', 32), 'hex'), 'r2', decode(repeat('02', 32), 'hex'), 'image/jpeg', 1, now() - interval '1 hour');

SET session_replication_role = origin;

-- TEN-06: each sweep crosses workspaces, returns ids only, orders deterministically and caps its batch.
SET ROLE kronaut_app;
SELECT pg_temp.must('TEN-06 due destinations: order by run_at, workspace, id',
  (SELECT array_agg(destination_id) FROM sweep_due_destinations(10)) = ARRAY[
    '00000000-0000-7000-8000-000000000211', '00000000-0000-7000-8000-000000000212',
    '00000000-0000-7000-8000-000000000214', '00000000-0000-7000-8000-000000000213']::uuid[]);
SELECT pg_temp.must('TEN-06 due destinations: limit honored', (SELECT count(*) FROM sweep_due_destinations(2)) = 2);
SELECT pg_temp.must('TEN-06 expired leases across workspaces',
  (SELECT array_agg(destination_id) FROM sweep_expired_leases(10)) = ARRAY[
    '00000000-0000-7000-8000-000000000222', '00000000-0000-7000-8000-000000000221']::uuid[]);
SELECT pg_temp.must('TEN-06 verifying across workspaces',
  (SELECT array_agg(workspace_id ORDER BY workspace_id) FROM sweep_verifying_destinations(10)) = ARRAY[:B1, :B2]::uuid[]);
SELECT pg_temp.must('TEN-06 credentials: window capped at 7 days, lease and account status honored',
  (SELECT array_agg(credential_id) FROM sweep_expiring_credentials(interval '60 days', 10)) = ARRAY[
    '00000000-0000-7000-8000-000000000301', '00000000-0000-7000-8000-000000000302']::uuid[]);
SELECT pg_temp.must('TEN-06 due webhook deliveries',
  (SELECT array_agg(delivery_id) FROM sweep_due_webhook_deliveries(10)) = ARRAY[
    '00000000-0000-7000-8000-000000000402', '00000000-0000-7000-8000-000000000401']::uuid[]);
SELECT pg_temp.must('TEN-06 media GC candidates, each once, expired uploads first',
  (SELECT array_agg(media_asset_id) FROM sweep_media_gc(10)) = ARRAY[
    '00000000-0000-7000-8000-000000000602', '00000000-0000-7000-8000-000000000601',
    '00000000-0000-7000-8000-000000000603']::uuid[]);
SELECT pg_temp.must('TEN-06 media GC: an expired upload is not crowded out by the limit',
  (SELECT array_agg(media_asset_id) FROM sweep_media_gc(1)) = ARRAY[
    '00000000-0000-7000-8000-000000000602']::uuid[]);
SELECT pg_temp.must('TEN-06 workspaces keyset first page',
  (SELECT array_agg(workspace_id) FROM sweep_workspaces(NULL, 2)) = ARRAY[:B1, :B2]::uuid[]);
SELECT pg_temp.must('TEN-06 workspaces keyset next page',
  (SELECT array_agg(workspace_id) FROM sweep_workspaces(:B2, 2)) = ARRAY[:B3]::uuid[]);
SELECT pg_temp.must('TEN-06 quarantine sweep empty while running',
  NOT EXISTS (SELECT 1 FROM sweep_quarantine_destinations(10)));

SELECT set_config('app.workspace_id', :B2, false);
SELECT pg_temp.must('TEN-06 handoff: a swept id from another workspace is invisible under withTenant',
  NOT EXISTS (SELECT 1 FROM post_destinations WHERE id = '00000000-0000-7000-8000-000000000212'));
SELECT set_config('app.workspace_id', '', false);
RESET ROLE;

SET session_replication_role = replica;
SELECT pg_temp.dest(:B1, gen_random_uuid(), 'scheduled', now() - interval '30 minutes') FROM generate_series(1, 1000);
SET session_replication_role = origin;
SET ROLE kronaut_app;
SELECT pg_temp.must('TEN-06 batch capped at 1000', (SELECT count(*) FROM sweep_due_destinations(5000)) = 1000);
SELECT pg_temp.must('TEN-06 negative limit returns nothing', (SELECT count(*) FROM sweep_due_destinations(-1)) = 0);

-- TEN-07: the app may only fence (pause); release and restore marking are operator-only.
SELECT pg_temp.must_fail('TEN-07 app cannot release', $$SELECT instance_release(gen_random_uuid())$$, '42501');
SELECT pg_temp.must_fail('TEN-07 app cannot mark restored', $$SELECT instance_mark_restored()$$, '42501');
SELECT pg_temp.must_fail('TEN-07 app cannot pause directly', $$SELECT instance_pause()$$, '42501');
SELECT pg_temp.must_fail('TEN-07 app cannot write instance_state', $$UPDATE instance_state SET publishing_paused = false$$, '42501');
SELECT pg_temp.must('TEN-07 first fence adopts the id', instance_fence('00000000-0000-7000-8000-00000000f001') = false);
SELECT pg_temp.must('TEN-07 same id stays running', instance_fence('00000000-0000-7000-8000-00000000f001') = false);
SELECT pg_temp.must('TEN-07 other id pauses', instance_fence('00000000-0000-7000-8000-00000000f002') = true);
SELECT pg_temp.must('TEN-07 pause reason recorded',
  (SELECT paused_reason FROM instance_state) = 'instance_id_mismatch');

SELECT pg_temp.must('AR-03 due sweep empty while paused', NOT EXISTS (SELECT 1 FROM sweep_due_destinations(10)));
SELECT pg_temp.must('AR-03 lease sweep empty while paused', NOT EXISTS (SELECT 1 FROM sweep_expired_leases(10)));
SELECT pg_temp.must('AR-03 verifying sweep empty while paused', NOT EXISTS (SELECT 1 FROM sweep_verifying_destinations(10)));
SELECT pg_temp.must('AR-03 credential sweep empty while paused',
  NOT EXISTS (SELECT 1 FROM sweep_expiring_credentials(interval '7 days', 10)));
SELECT pg_temp.must('AR-03 webhook sweep empty while paused', NOT EXISTS (SELECT 1 FROM sweep_due_webhook_deliveries(10)));
SELECT pg_temp.must('AR-03 media GC empty while paused', NOT EXISTS (SELECT 1 FROM sweep_media_gc(10)));
SELECT pg_temp.must('AR-03 DB-local workspace sweep still runs', EXISTS (SELECT 1 FROM sweep_workspaces(NULL, 10)));
SELECT pg_temp.must('AR-03 quarantine sweep lists past-due unsent rows, never publishing ones',
  (SELECT count(*) FROM sweep_quarantine_destinations(5000)) = 1000
  AND NOT EXISTS (SELECT 1 FROM sweep_quarantine_destinations(5000)
                   WHERE destination_id IN ('00000000-0000-7000-8000-000000000221', '00000000-0000-7000-8000-000000000222')));
RESET ROLE;

SET ROLE kronaut_operator;
SELECT pg_temp.must_fail('TEN-04 operator cannot create a temporary table', $$CREATE TEMP TABLE x (id int)$$, '42501');
SELECT pg_temp.must_fail('TEN-07 operator cannot sweep', $$SELECT * FROM sweep_due_destinations(1)$$, '42501');
SELECT set_config('app.workspace_id', :B1, false);
SELECT pg_temp.must_fail('TEN-07 operator cannot read tenant data', $$SELECT * FROM posts$$, '42501');
SELECT set_config('app.workspace_id', '', false);
SELECT instance_pause();
SELECT pg_temp.must('TEN-07 operator pause keeps the original reason',
  (SELECT paused_reason FROM instance_state) = 'instance_id_mismatch');
SELECT instance_release('00000000-0000-7000-8000-00000000f002');
SELECT pg_temp.must('TEN-07 operator release adopts the new id',
  (SELECT NOT publishing_paused AND instance_id = '00000000-0000-7000-8000-00000000f002' FROM instance_state));
SELECT pg_temp.must('TEN-07 mark restored bumps the epoch', instance_mark_restored() = 1);
SELECT pg_temp.must('TEN-07 restore quarantines',
  (SELECT paused_reason FROM instance_state) = 'restore_quarantine');
RESET ROLE;
SELECT pg_temp.must('TEN-07 instance actions are logged',
  (SELECT array_agg(kind ORDER BY occurred_at, kind) FROM security_events WHERE kind LIKE 'instance.%')
  @> ARRAY['instance.fenced','instance.paused','instance.released','instance.restored']);

-- AR-01: direct reads and writes on protected global tables fail or see only the caller's own rows.
SET ROLE kronaut_app;
SELECT set_config('app.actor', 'user:' || :U1, false);
SELECT set_config('app.workspace_id', :B1, false);
SELECT pg_temp.must('AR-01 users: only self', (SELECT array_agg(id) FROM users) = ARRAY[:U1]::uuid[]);
SELECT pg_temp.must('AR-01 sessions: only own', (SELECT count(*) FROM sessions WHERE user_id <> :U1) = 0);
SELECT pg_temp.must('AR-01 security events: only own', (SELECT count(*) FROM security_events WHERE user_id IS DISTINCT FROM :U1) = 0);
WITH u AS (UPDATE users SET display_name = 'pwned' WHERE id = :U2 RETURNING 1)
SELECT pg_temp.must('AR-01 cannot update another user', count(*) = 0) FROM u;
SELECT pg_temp.must_fail('AR-01 cannot create users directly', $$INSERT INTO users (email, email_normalized) VALUES ('z@x','z@x')$$, '42501');
SELECT pg_temp.must_fail('AR-01 cannot delete users', $$DELETE FROM users$$, '42501');
SELECT pg_temp.must_fail('AR-01 cannot create a session for another user',
  $$INSERT INTO sessions (token_hash, user_id, expires_at, idle_expires_at, reauthenticated_at) VALUES (decode(repeat('5f', 32), 'hex'), '00000000-0000-7000-8000-000000000002', now() + interval '1 day', now() + interval '1 hour', now())$$, '42501');
SELECT pg_temp.must_fail('AR-01 cannot rewrite security events', $$UPDATE security_events SET kind = 'x.y'$$, '42501');
SELECT pg_temp.must_fail('AR-01 cannot create workspaces directly',
  $$INSERT INTO workspaces (organization_id, name, slug, timezone) VALUES ('00000000-0000-7000-8000-0000000000a2', 'x', 'x', 'UTC')$$, '42501');
SELECT pg_temp.must_fail('AR-01 cannot create organizations directly', $$INSERT INTO organizations (name) VALUES ('x')$$, '42501');
SELECT pg_temp.must_fail('AR-01 cannot change plan', $$UPDATE organizations SET plan = 'pro'$$, '42501');
SELECT pg_temp.must_fail('AR-01 cannot move a workspace between organizations',
  $$UPDATE workspaces SET organization_id = '00000000-0000-7000-8000-0000000000a2'$$, '42501');
SELECT pg_temp.must_fail('AR-01 cannot write entitlements', $$INSERT INTO entitlement_overrides VALUES ('00000000-0000-7000-8000-0000000000a1', 'seats', '999')$$, '42501');
SELECT pg_temp.must_fail('AR-01 cannot register an instance-wide provider app',
  $$INSERT INTO provider_apps (provider, client_id) VALUES ('bluesky', 'evil')$$, '42501');
SELECT pg_temp.must_fail('AR-01 cannot disable a provider app',
  $$UPDATE provider_apps SET status = 'disabled' WHERE id = '00000000-0000-7000-8000-0000000000c2'$$, '42501');
SELECT pg_temp.must_fail('AR-01 cannot delete Meta lifecycle requests', $$DELETE FROM meta_lifecycle_requests$$, '42501');
SELECT pg_temp.must_fail('AR-01 cannot rewrite a Meta lifecycle request',
  $$UPDATE meta_lifecycle_requests SET confirmation_code = repeat('C', 20)$$, '42501');
SELECT pg_temp.must_fail('AR-01 cannot replace provider app credentials',
  $$UPDATE provider_apps SET client_id = 'evil'$$, '42501');
SELECT pg_temp.must_fail('AR-01 cannot read deletion receipts', $$SELECT * FROM deletion_receipts$$, '42501');
SELECT pg_temp.must_fail('TEN-04 app cannot shadow a table with a temporary one',
  $$CREATE TEMP TABLE workspaces (id uuid, organization_id uuid)$$, '42501');
INSERT INTO provider_apps (provider, instance_host, client_id) VALUES ('mastodon', 'social.example', 'z');

SELECT pg_temp.must('AR-01 workspaces: only current', (SELECT array_agg(id) FROM workspaces) = ARRAY[:B1]::uuid[]);
SELECT pg_temp.must('AR-01 organizations: only current', (SELECT array_agg(id) FROM organizations) = ARRAY[:A1]::uuid[]);
SELECT pg_temp.must('AR-01 entitlements: only current organization',
  (SELECT array_agg(value::text) FROM entitlement_overrides) = ARRAY['5']);
SELECT pg_temp.must_fail('AR-01 cannot count usage for another organization',
  $$INSERT INTO usage_counters (organization_id, metric, period_start) VALUES ('00000000-0000-7000-8000-0000000000a2', 'posts.published', '2026-10-01')$$, '42501');
INSERT INTO usage_counters (organization_id, metric, period_start) VALUES (:A1, 'posts.published', '2026-10-01');

-- Definer entry points: identity and provisioning.
SELECT pg_temp.must('auth: member profiles of current workspace only',
  (SELECT array_agg(user_id) FROM workspace_member_profiles()) = ARRAY[:U1, :U2]::uuid[]);
SELECT pg_temp.must('auth: workspace picker lists the acting user''s workspaces',
  (SELECT array_agg(workspace_id ORDER BY workspace_id) FROM auth_user_workspaces(:U1)) = ARRAY[:B1, :B2]::uuid[]);
SELECT pg_temp.must_fail('auth: workspace picker refuses another user',
  $$SELECT * FROM auth_user_workspaces('00000000-0000-7000-8000-000000000003')$$, 'KR006');
SELECT pg_temp.must_fail('auth: workspace picker refuses a null user',
  $$SELECT * FROM auth_user_workspaces(NULL)$$, 'KR006');
SELECT pg_temp.must('auth: login lookup', (SELECT user_id FROM auth_login_lookup('b@x')) = :U2);
SELECT pg_temp.must('auth: valid session', (SELECT user_id FROM auth_lookup_session(decode(repeat('52', 32), 'hex'))) = :U2);
SELECT pg_temp.must('auth: expired session', NOT EXISTS (SELECT 1 FROM auth_lookup_session(decode(repeat('53', 32), 'hex'))));
SELECT set_config('app.workspace_id', '', false);

SELECT set_config('app.actor', 'user:' || :U2, false);
SELECT pg_temp.must_fail('provision: non-owner cannot add a workspace',
  $$SELECT provision_workspace('00000000-0000-7000-8000-0000000000a1', 'x', 'x', 'UTC')$$, 'KR006');
SELECT set_config('app.actor', 'user:' || :U3, false);
SELECT pg_temp.must_fail('provision: owner elsewhere cannot add a workspace here',
  $$SELECT provision_workspace('00000000-0000-7000-8000-0000000000a1', 'x', 'x', 'UTC')$$, 'KR006');
SELECT set_config('app.actor', 'user:00000000-0000-7000-8000-000000000009', false);
SELECT pg_temp.must_fail('provision: erased user', $$SELECT provision_organization('x', 'x', 'x', 'UTC')$$, 'KR006');
SELECT set_config('app.actor', 'grant:00000000-0000-7000-8000-0000000000e1', false);
SELECT pg_temp.must_fail('provision: grants cannot provision', $$SELECT provision_organization('x', 'x', 'x', 'UTC')$$, 'KR006');
SELECT pg_temp.must_fail('auth: grants have no workspace picker',
  $$SELECT * FROM auth_user_workspaces('00000000-0000-7000-8000-000000000001')$$, 'KR006');
SELECT pg_temp.must_fail('auth: a grant cannot list workspaces for a null user',
  $$SELECT * FROM auth_user_workspaces(NULL)$$, 'KR006');
SELECT set_config('app.actor', 'user:' || :U1, false);
SELECT pg_temp.must('provision: owner adds a workspace',
  provision_workspace(:A1, 'WS4', 'ws4', 'UTC') IS NOT NULL);
SELECT set_config('app.workspace_id', (SELECT workspace_id::text FROM provision_organization('New org', 'Main', 'main', 'UTC')), false);
SELECT pg_temp.must('provision: creator is owner and approver of the new workspace',
  (SELECT role = 'owner' AND can_approve FROM workspace_member_profiles()));
SELECT pg_temp.must('provision: the new workspace gets a no-approval policy',
  (SELECT mode = 'none' AND allow_self_approval AND brand_id IS NULL FROM approval_policies));
SELECT set_config('app.workspace_id', '', false);
SELECT pg_temp.must('auth: create user', auth_create_user('n@x', 'n@x', 'N', 'h', 'sk') IS NOT NULL);

SELECT pg_temp.must_fail('slo: window over 31 days', $$SELECT * FROM slo_publish_stats(now() - interval '40 days', now())$$, '22023');
SELECT pg_temp.must('slo: aggregates', (SELECT auto_total >= 0 AND duplicates >= 0 FROM slo_publish_stats(now() - interval '1 day', now())));
SELECT pg_temp.must('retention: expired session purged',
  (SELECT affected FROM purge_instance_retention(100) WHERE relation = 'sessions') = 1);
SELECT pg_temp.must('retention: Meta lifecycle requests purged 180 days after completion, or 30 days after receipt when incomplete',
  (SELECT array_agg(provider ORDER BY provider) FROM meta_lifecycle_requests) = ARRAY['facebook', 'threads']);
SELECT pg_temp.must('audit: partitions exist two months ahead and the default partition is empty',
  (SELECT count(*) FROM pg_inherits WHERE inhparent = 'audit_events'::regclass) >= 4
  AND (SELECT affected FROM maintain_audit_partitions(100) WHERE relation = 'audit_events_default') = 0);
RESET ROLE;

-- TEN-04: a plain pg_dump restore grants TEMPORARY to PUBLIC again; temporary tables must still not stand in
-- for the real ones inside RLS helpers and triggers.
SET session_replication_role = replica;
\set P1 '''00000000-0000-7000-8000-000000000701'''
\set P2 '''00000000-0000-7000-8000-000000000702'''
\set I1 '''00000000-0000-7000-8000-000000000703'''
\set D1 '''00000000-0000-7000-8000-000000000704'''
\set R1 '''00000000-0000-7000-8000-000000000705'''
\set V1 '''00000000-0000-7000-8000-000000000707'''
INSERT INTO posts (workspace_id, id, origin) VALUES (:B1, :P1, 'ui'), (:B1, :P2, 'ui');
INSERT INTO post_variants (workspace_id, id, post_id, is_default) VALUES (:B1, :V1, :P2, true);
INSERT INTO variant_items (workspace_id, id, post_id, variant_id, position, role, doc, doc_schema_v)
  VALUES (:B1, :I1, :P1, gen_random_uuid(), 0, 'main', '{"type":"doc"}', 1);
INSERT INTO item_media (workspace_id, id, item_id, media_asset_id, position)
  VALUES (:B1, '00000000-0000-7000-8000-000000000706', :I1, '00000000-0000-7000-8000-000000000601', 0);
INSERT INTO post_destinations (workspace_id, id, post_id, social_account_id, provider, publish_type, variant_id,
                               selection_source, account_label)
  VALUES (:B1, :D1, :P2, '00000000-0000-7000-8000-0000000000d1', 'bluesky', 'post', :V1, 'manual', 'A');
INSERT INTO approval_requests (workspace_id, id, post_id, post_version, content_hash, content_hash_v, policy_snapshot,
                               required_approvals, requested_by_user_id)
  VALUES (:B1, :R1, :P1, 9, decode(repeat('aa', 32), 'hex'), 1, '{}', 1, :U1);
SET session_replication_role = origin;
DO $$ BEGIN EXECUTE format('GRANT TEMPORARY ON DATABASE %I TO PUBLIC', current_database()); END $$;

SET ROLE kronaut_app;
SELECT set_config('app.actor', 'user:' || :U1, false);
SELECT set_config('app.workspace_id', :B1, false);
CREATE TEMP TABLE workspaces (id uuid, organization_id uuid);
INSERT INTO workspaces VALUES (:B1, :A2);
CREATE TEMP TABLE posts (workspace_id uuid, id uuid, brand_id uuid, agent_dirty boolean);
INSERT INTO posts VALUES (:B1, :P1, NULL, false), (:B1, :P2, NULL, false);
CREATE TEMP TABLE destination_transitions (from_state text, to_state text);
INSERT INTO destination_transitions VALUES ('draft', 'published');
CREATE TEMP TABLE variant_items (workspace_id uuid, id uuid, post_id uuid);
INSERT INTO variant_items VALUES (:B1, :I1, :P2);
CREATE TEMP TABLE post_revisions (workspace_id uuid, post_id uuid, post_version integer, agent_tainted boolean);
INSERT INTO post_revisions VALUES (:B1, :P1, 1, false);
CREATE TEMP TABLE approval_decisions (workspace_id uuid, request_id uuid, decision text, approver_kind text, user_id uuid);
INSERT INTO approval_decisions VALUES (:B1, :R1, 'approve', 'user', :U2);
CREATE TEMP TABLE instance_state (publishing_paused boolean);
INSERT INTO instance_state VALUES (false);

SELECT pg_temp.must('TEN-04 shadowed workspaces: organization RLS keeps the real organization',
  (SELECT array_agg(id) FROM public.organizations) = ARRAY[:A1]::uuid[]);
SELECT pg_temp.must('TEN-04 shadowed workspaces: entitlement RLS keeps the real organization',
  (SELECT array_agg(value::text) FROM public.entitlement_overrides) = ARRAY['5']);
SELECT pg_temp.must('TEN-04 shadowed instance_state: pause still read from the real row', instance_paused());
SELECT pg_temp.must_fail('TEN-04 shadowed transitions: illegal destination transition still rejected',
  $$UPDATE public.post_destinations SET state = 'published', version = 2 WHERE id = '00000000-0000-7000-8000-000000000704'$$,
  'KR001');
SELECT pg_temp.must_fail('TEN-04 shadowed decisions: approval still counts the real decisions',
  $$UPDATE public.approval_requests SET state = 'approved', resolved_at = now() WHERE id = '00000000-0000-7000-8000-000000000705'$$,
  'KR004');

SELECT set_config('app.actor', 'grant:00000000-0000-7000-8000-0000000000e1', false);
UPDATE public.item_media SET alt_text = 'agent' WHERE id = '00000000-0000-7000-8000-000000000706';
SELECT pg_temp.must('TEN-04 shadowed variant_items and posts: a grant media edit marks the real post',
  (SELECT array_agg(id ORDER BY id) FROM public.posts WHERE agent_dirty) = ARRAY[:P1]::uuid[]);
UPDATE public.post_destinations SET settings = '{"agent":1}' WHERE id = :D1;
SELECT pg_temp.must('TEN-04 shadowed posts: a grant destination edit marks the real post',
  (SELECT array_agg(id ORDER BY id) FROM public.posts WHERE agent_dirty) = ARRAY[:P1, :P2]::uuid[]);

SELECT set_config('app.actor', 'user:' || :U1, false);
INSERT INTO public.post_revisions (workspace_id, post_id, post_version, snapshot, snapshot_v, content_hash,
                                   content_hash_v, reason)
  VALUES (:B1, :P1, 1, '{}', 1, decode(repeat('ab', 32), 'hex'), 1, 'checkpoint');
SELECT pg_temp.must('TEN-04 shadowed posts: a human revision inherits the real taint and clears the real flag',
  (SELECT r.agent_tainted AND NOT p.agent_dirty FROM public.post_revisions r
     JOIN public.posts p ON p.workspace_id = r.workspace_id AND p.id = r.post_id WHERE r.post_id = :P1));
INSERT INTO public.revision_destinations (workspace_id, post_id, post_version, social_account_id, publish_type,
                                          variant_id, content_hash)
  VALUES (:B1, :P1, 1, '00000000-0000-7000-8000-0000000000d1', 'post', gen_random_uuid(), decode(repeat('cd', 32), 'hex'));
SELECT pg_temp.must('TEN-04 shadowed post_revisions: destination authorship follows the real revision',
  (SELECT agent_authored FROM public.revision_destinations WHERE post_id = :P1));
RESET ROLE;

\o
SELECT 'privileges.sql: all checks passed';
ROLLBACK;
