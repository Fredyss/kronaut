ALTER TABLE provider_apps ADD COLUMN workspace_id uuid;

ALTER TABLE provider_apps ADD CONSTRAINT fk_provider_apps_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces ON DELETE CASCADE NOT VALID;

ALTER TABLE provider_apps VALIDATE CONSTRAINT fk_provider_apps_workspace;

ALTER TABLE provider_apps ADD CONSTRAINT ck_provider_apps_workspace_host
  CHECK (workspace_id IS NULL OR instance_host = '') NOT VALID;

ALTER TABLE provider_apps VALIDATE CONSTRAINT ck_provider_apps_workspace_host;

-- Column grants cover every row, so the secret columns the app may now update need a row check: on instance
-- rows the app still changes only the health columns (ADR-0067).
CREATE FUNCTION trg_provider_app_instance_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.workspace_id IS NULL AND pg_has_role('kronaut_app', 'MEMBER')
     AND NOT pg_has_role('kronaut_operator', 'USAGE')
     AND (to_jsonb(NEW) - '{status,last_verified_at,updated_at}'::text[])
         IS DISTINCT FROM (to_jsonb(OLD) - '{status,last_verified_at,updated_at}'::text[]) THEN
    RAISE EXCEPTION 'only the operator changes an instance app beyond its health' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_provider_app_instance_guard BEFORE UPDATE ON provider_apps
  FOR EACH ROW EXECUTE FUNCTION trg_provider_app_instance_guard();

ALTER POLICY app_register ON provider_apps WITH CHECK (instance_host <> '' AND workspace_id IS NULL);

ALTER POLICY app_health ON provider_apps
  USING (workspace_id IS NULL AND status <> 'disabled')
  WITH CHECK (workspace_id IS NULL AND status <> 'disabled');

-- Not app_workspace_id(): it raises without a tenant, and health updates on instance rows run under withActor,
-- where every permissive UPDATE policy is evaluated.
CREATE POLICY workspace_app_register ON provider_apps FOR INSERT TO kronaut_app
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);

CREATE POLICY workspace_app_update ON provider_apps FOR UPDATE TO kronaut_app
  USING (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);

GRANT UPDATE (client_secret_ciphertext, client_secret_nonce, client_secret_wrapped_dek, kek_version)
  ON provider_apps TO kronaut_app;
