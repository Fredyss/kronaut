CREATE UNIQUE INDEX CONCURRENTLY ux_account_groups_name ON account_groups (workspace_id, lower(name));
