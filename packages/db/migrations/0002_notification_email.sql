DROP FUNCTION workspace_member_profiles();

CREATE FUNCTION workspace_member_profiles()
RETURNS TABLE (user_id uuid, display_name text, email text, role text, can_approve boolean, ui_locale text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT m.user_id, u.display_name, u.email, m.role, m.can_approve, u.ui_locale
    FROM memberships m JOIN users u ON u.id = m.user_id
   WHERE m.workspace_id = app_workspace_id()
   ORDER BY m.user_id
$$;

REVOKE ALL ON FUNCTION workspace_member_profiles() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION workspace_member_profiles() TO kronaut_app;

ALTER TABLE notifications
  ADD COLUMN email_attempts smallint NOT NULL DEFAULT 0,
  ADD COLUMN email_retry_at timestamptz;
