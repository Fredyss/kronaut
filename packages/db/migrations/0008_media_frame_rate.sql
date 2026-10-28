ALTER TABLE media_assets ADD COLUMN frame_rate_milli integer;

ALTER TABLE media_assets ADD CONSTRAINT ck_media_assets_frame_rate
  CHECK (frame_rate_milli IS NULL OR (frame_rate_milli > 0 AND kind = 'video')) NOT VALID;

ALTER TABLE media_assets VALIDATE CONSTRAINT ck_media_assets_frame_rate;
