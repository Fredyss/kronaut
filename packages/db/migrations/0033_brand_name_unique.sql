CREATE UNIQUE INDEX CONCURRENTLY ux_brands_name ON brands (workspace_id, lower(name));
