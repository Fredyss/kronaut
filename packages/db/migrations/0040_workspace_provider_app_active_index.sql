CREATE UNIQUE INDEX CONCURRENTLY ux_provider_apps_workspace_active ON provider_apps (workspace_id, provider)
  WHERE workspace_id IS NOT NULL AND status <> 'disabled';
