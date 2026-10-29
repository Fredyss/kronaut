CREATE INDEX CONCURRENTLY ix_acc_subject ON social_accounts (workspace_id, provider, provider_subject_id)
  WHERE provider_subject_id IS NOT NULL;
