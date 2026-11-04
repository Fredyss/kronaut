ALTER TABLE rss_items ADD COLUMN media_import_id uuid;

ALTER TABLE rss_items ADD COLUMN text text;

ALTER TABLE rss_items ADD COLUMN alt_text text;

ALTER TABLE rss_items ADD CONSTRAINT fk_rss_items_media_import FOREIGN KEY (workspace_id, media_import_id)
  REFERENCES media_imports ON DELETE SET NULL (media_import_id) NOT VALID;

ALTER TABLE rss_items VALIDATE CONSTRAINT fk_rss_items_media_import;

ALTER TABLE rss_items ADD CONSTRAINT ck_rss_items_outcome
  CHECK (outcome IN ('seen','fetching_media','scheduled','requested','drafted','skipped','retrying','failed')) NOT VALID;

ALTER TABLE rss_items VALIDATE CONSTRAINT ck_rss_items_outcome;

ALTER TABLE rss_items DROP CONSTRAINT rss_items_outcome_check;

ALTER TABLE rss_items ADD CONSTRAINT ck_rss_items_text
  CHECK (octet_length(text) <= 65536 AND char_length(alt_text) <= 1500) NOT VALID;

ALTER TABLE rss_items VALIDATE CONSTRAINT ck_rss_items_text;

ALTER TABLE rss_items ADD CONSTRAINT ck_rss_items_fetching
  CHECK ((outcome = 'fetching_media') = (text IS NOT NULL) AND (alt_text IS NULL OR text IS NOT NULL)) NOT VALID;

ALTER TABLE rss_items VALIDATE CONSTRAINT ck_rss_items_fetching;
