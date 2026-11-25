-- Workspace provider apps (ADR-0067): the app role writes only the current workspace's rows, never moves a row
-- between workspaces, and still changes only the health of instance rows. Runs as a superuser in one
-- transaction that is rolled back; any failure raises.
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

CREATE FUNCTION pg_temp.touched(stmt text) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  EXECUTE stmt;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

\set ORG '''00000000-0000-7000-8000-0000000000a1'''
\set WA '''00000000-0000-7000-8000-0000000000b1'''
\set WB '''00000000-0000-7000-8000-0000000000b2'''
\set APP_A '''00000000-0000-7000-8000-0000000001a1'''
\set APP_B '''00000000-0000-7000-8000-0000000001b1'''
\set APP_I '''00000000-0000-7000-8000-0000000001c1'''

INSERT INTO organizations (id, name) VALUES (:ORG, 'Org');
INSERT INTO workspaces (id, organization_id, name, slug, timezone) VALUES
  (:WA, :ORG, 'A', 'wa', 'Europe/Bratislava'), (:WB, :ORG, 'B', 'wb', 'Europe/Prague');
INSERT INTO provider_apps (id, provider, client_id, workspace_id) VALUES (:APP_B, 'x_com', 'client-b', :WB);
INSERT INTO provider_apps (id, provider, client_id) VALUES (:APP_I, 'x_com', 'client-instance');

SELECT pg_temp.must_fail('a workspace row has no instance host',
  $$INSERT INTO provider_apps (provider, instance_host, client_id, workspace_id)
    VALUES ('mastodon', 'social.example', 'c', '00000000-0000-7000-8000-0000000000b1')$$, '23514');

SET ROLE kronaut_app;
SELECT set_config('app.actor', 'system', false);
SELECT set_config('app.workspace_id', :WA, false);

SELECT pg_temp.must('A registers its own app',
  pg_temp.touched($$INSERT INTO provider_apps (id, provider, client_id, workspace_id)
    VALUES ('00000000-0000-7000-8000-0000000001a1', 'x_com', 'client-a', '00000000-0000-7000-8000-0000000000b1')$$) = 1);
SELECT pg_temp.must_fail('A cannot register an app for B',
  $$INSERT INTO provider_apps (provider, client_id, workspace_id)
    VALUES ('x_com', 'client-a2', '00000000-0000-7000-8000-0000000000b2')$$, '42501');
SELECT pg_temp.must_fail('A cannot register an instance-wide app',
  $$INSERT INTO provider_apps (provider, client_id) VALUES ('x_com', 'client-a3')$$, '42501');
SELECT pg_temp.must_fail('A cannot register a second live app for a provider',
  $$INSERT INTO provider_apps (provider, client_id, workspace_id)
    VALUES ('x_com', 'client-a4', '00000000-0000-7000-8000-0000000000b1')$$, '23505');
SELECT pg_temp.must_fail('a client id another workspace holds is refused',
  $$INSERT INTO provider_apps (provider, client_id, workspace_id)
    VALUES ('x_com', 'client-b', '00000000-0000-7000-8000-0000000000b1')$$, '23505');

SELECT pg_temp.must('A cannot update B''s app',
  pg_temp.touched($$UPDATE provider_apps SET kek_version = 9
    WHERE id = '00000000-0000-7000-8000-0000000001b1'$$) = 0);
SELECT pg_temp.must('A cannot disable B''s app',
  pg_temp.touched($$UPDATE provider_apps SET status = 'disabled'
    WHERE id = '00000000-0000-7000-8000-0000000001b1'$$) = 0);
SELECT pg_temp.must('A cannot flag B''s app',
  pg_temp.touched($$UPDATE provider_apps SET status = 'misconfigured'
    WHERE id = '00000000-0000-7000-8000-0000000001b1'$$) = 0);
SELECT pg_temp.must_fail('A cannot move its app to B',
  $$UPDATE provider_apps SET workspace_id = '00000000-0000-7000-8000-0000000000b2'
    WHERE id = '00000000-0000-7000-8000-0000000001a1'$$, '42501');
SELECT pg_temp.must_fail('A cannot make its app instance-wide',
  $$UPDATE provider_apps SET workspace_id = NULL WHERE id = '00000000-0000-7000-8000-0000000001a1'$$, '42501');
SELECT pg_temp.must_fail('A cannot delete its app',
  $$DELETE FROM provider_apps WHERE id = '00000000-0000-7000-8000-0000000001a1'$$, '42501');

SELECT pg_temp.must('A replaces its secret',
  pg_temp.touched($$UPDATE provider_apps
    SET client_secret_ciphertext = '\x01', client_secret_nonce = '\x02', client_secret_wrapped_dek = '\x03',
        kek_version = 1, status = 'active'
    WHERE id = '00000000-0000-7000-8000-0000000001a1'$$) = 1);
SELECT pg_temp.must('A disables its app',
  pg_temp.touched($$UPDATE provider_apps SET status = 'disabled'
    WHERE id = '00000000-0000-7000-8000-0000000001a1'$$) = 1);
SELECT pg_temp.must('after disabling, A registers a new app',
  pg_temp.touched($$INSERT INTO provider_apps (provider, client_id, workspace_id)
    VALUES ('x_com', 'client-a5', '00000000-0000-7000-8000-0000000000b1')$$) = 1);

SELECT pg_temp.must_fail('the app cannot change an instance app''s secret',
  $$UPDATE provider_apps SET kek_version = 9 WHERE id = '00000000-0000-7000-8000-0000000001c1'$$, '42501');
SELECT pg_temp.must_fail('the app cannot disable an instance app',
  $$UPDATE provider_apps SET status = 'disabled' WHERE id = '00000000-0000-7000-8000-0000000001c1'$$, '42501');
SELECT pg_temp.must('the app reports an instance app''s health under a tenant',
  pg_temp.touched($$UPDATE provider_apps SET status = 'misconfigured', last_verified_at = now()
    WHERE id = '00000000-0000-7000-8000-0000000001c1'$$) = 1);

SELECT set_config('app.workspace_id', '', false);
SELECT pg_temp.must('without a tenant, instance health still updates and no workspace row is writable',
  pg_temp.touched($$UPDATE provider_apps SET status = 'active'
    WHERE id = '00000000-0000-7000-8000-0000000001c1'$$) = 1
  AND pg_temp.touched($$UPDATE provider_apps SET status = 'misconfigured'
    WHERE workspace_id IS NOT NULL$$) = 0);
RESET ROLE;

SET ROLE kronaut_operator;
SELECT pg_temp.must('the operator still rewrites an instance app''s secret',
  pg_temp.touched($$UPDATE provider_apps SET client_id = 'client-instance-2'
    WHERE id = '00000000-0000-7000-8000-0000000001c1'$$) = 1);
RESET ROLE;

\o
SELECT 'workspace-apps.sql: all checks passed';
ROLLBACK;
