#!/bin/sh
set -eu

psql -v ON_ERROR_STOP=1 --no-psqlrc --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
\set app_password `cat /run/secrets/postgres_app_password`
\set operator_password `cat /run/secrets/postgres_operator_password`
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kronaut_app') THEN
    CREATE ROLE kronaut_app NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kronaut_operator') THEN
    CREATE ROLE kronaut_operator NOLOGIN;
  END IF;
END $$;
CREATE ROLE kronaut_app_login LOGIN PASSWORD :'app_password' IN ROLE kronaut_app;
CREATE ROLE kronaut_operator_login LOGIN PASSWORD :'operator_password' IN ROLE kronaut_operator;
SQL
