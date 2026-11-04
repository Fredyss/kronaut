CREATE TABLE link_shorteners (
  workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
  id uuid NOT NULL DEFAULT uuidv7(),
  provider text NOT NULL CHECK (provider IN ('dub','kutt')),
  base_url text NOT NULL CHECK (base_url ~ '^https://' AND char_length(base_url) <= 2048),
  domain text CHECK (char_length(domain) BETWEEN 1 AND 190),
  key_ciphertext bytea NOT NULL,
  key_nonce bytea NOT NULL,
  key_wrapped_dek bytea NOT NULL,
  kek_version integer NOT NULL,
  aad_v smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  UNIQUE (workspace_id),
  CHECK (provider <> 'dub' OR base_url = 'https://api.dub.co')
);

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON link_shorteners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE link_shorteners ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON link_shorteners USING (workspace_id = app_workspace_id())
  WITH CHECK (workspace_id = app_workspace_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON link_shorteners TO kronaut_app;

ALTER TABLE social_accounts ADD COLUMN shorten_links boolean NOT NULL DEFAULT true;

CREATE TABLE short_links (
  workspace_id uuid NOT NULL,
  destination_id uuid NOT NULL,
  url_sha256 bytea NOT NULL CHECK (octet_length(url_sha256) = 32),
  long_url text NOT NULL CHECK (char_length(long_url) <= 32000),
  target text NOT NULL CHECK (char_length(target) <= 32000),
  short_url text CHECK (char_length(short_url) <= 2048),
  link_id text CHECK (char_length(link_id) <= 190),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','ready','failed')),
  error_code text CHECK (error_code ~ '^[a-z_]{1,64}$'),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, destination_id, url_sha256),
  FOREIGN KEY (workspace_id, destination_id) REFERENCES post_destinations ON DELETE CASCADE,
  CHECK ((state = 'ready') = (short_url IS NOT NULL)),
  CHECK ((state = 'failed') = (error_code IS NOT NULL))
);

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON short_links
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON short_links USING (workspace_id = app_workspace_id())
  WITH CHECK (workspace_id = app_workspace_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON short_links TO kronaut_app;
