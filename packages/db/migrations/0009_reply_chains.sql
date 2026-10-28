INSERT INTO destination_state_reasons VALUES ('retry_wait','chain_next'), ('failed','thread_incomplete');

ALTER TABLE destination_items ADD COLUMN anchor jsonb;

ALTER TABLE publish_attempts ADD COLUMN anchor jsonb;

ALTER TABLE destination_items ADD CONSTRAINT ck_destination_items_position
  CHECK (position >= 0 AND position < 100) NOT VALID;

ALTER TABLE destination_items ADD CONSTRAINT ck_destination_items_main
  CHECK ((position = 0) = (role = 'main')) NOT VALID;

ALTER TABLE destination_items VALIDATE CONSTRAINT ck_destination_items_position;

ALTER TABLE destination_items VALIDATE CONSTRAINT ck_destination_items_main;
