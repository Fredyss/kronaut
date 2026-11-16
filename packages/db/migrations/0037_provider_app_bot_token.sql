ALTER TABLE provider_apps
  ADD COLUMN bot_token_ciphertext bytea,
  ADD COLUMN bot_token_nonce bytea,
  ADD COLUMN bot_token_wrapped_dek bytea,
  ADD COLUMN bot_token_kek_version smallint;

ALTER TABLE provider_apps ADD CONSTRAINT ck_provider_apps_bot_token
  CHECK (num_nulls(bot_token_ciphertext, bot_token_nonce, bot_token_wrapped_dek, bot_token_kek_version) IN (0,4)) NOT VALID;

ALTER TABLE provider_apps VALIDATE CONSTRAINT ck_provider_apps_bot_token;
