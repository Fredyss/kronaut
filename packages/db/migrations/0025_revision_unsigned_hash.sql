ALTER TABLE revision_destinations ADD COLUMN unsigned_hash hash32;

CREATE OR REPLACE FUNCTION trg_revision_dest_agent() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tainted boolean; prev_hash bytea; prev_unsigned bytea; prev_flag boolean;
BEGIN
  SELECT agent_tainted INTO tainted FROM public.post_revisions
   WHERE workspace_id = NEW.workspace_id AND post_id = NEW.post_id AND post_version = NEW.post_version;
  SELECT content_hash, coalesce(unsigned_hash, content_hash), agent_authored INTO prev_hash, prev_unsigned, prev_flag
    FROM public.revision_destinations
   WHERE workspace_id = NEW.workspace_id AND post_id = NEW.post_id AND social_account_id = NEW.social_account_id
     AND publish_type = NEW.publish_type AND post_version < NEW.post_version
   ORDER BY post_version DESC LIMIT 1;
  NEW.agent_authored := (coalesce(tainted, false) AND prev_hash IS DISTINCT FROM NEW.content_hash)
                     OR (coalesce(prev_flag, false) AND prev_unsigned = coalesce(NEW.unsigned_hash, NEW.content_hash));
  RETURN NEW;
END $$;
