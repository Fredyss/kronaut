DROP FUNCTION auth_user_workspaces(uuid);

CREATE FUNCTION auth_user_workspaces(p_user uuid)
RETURNS TABLE (workspace_id uuid, organization_id uuid, name text, role text, can_approve boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_user IS NULL OR p_user IS DISTINCT FROM app_actor_id('user') THEN
    RAISE EXCEPTION 'only the acting user can list their workspaces' USING ERRCODE = 'KR006';
  END IF;
  RETURN QUERY
  SELECT w.id, w.organization_id, w.name, m.role, m.can_approve FROM memberships m JOIN workspaces w ON w.id = m.workspace_id
   WHERE m.user_id = p_user AND w.deletion_requested_at IS NULL;
END $$;

REVOKE ALL ON FUNCTION auth_user_workspaces(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION auth_user_workspaces(uuid) TO kronaut_app;
