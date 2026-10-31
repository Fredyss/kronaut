CREATE INDEX CONCURRENTLY ix_acc_saved_text ON social_accounts (workspace_id, saved_text_id) WHERE saved_text_id IS NOT NULL;
