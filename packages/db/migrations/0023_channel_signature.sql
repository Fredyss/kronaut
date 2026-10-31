ALTER TABLE social_accounts ADD COLUMN saved_text_id uuid;

ALTER TABLE social_accounts ADD CONSTRAINT fk_social_accounts_saved_text FOREIGN KEY (workspace_id, saved_text_id)
  REFERENCES saved_texts ON DELETE SET NULL (saved_text_id) NOT VALID;

ALTER TABLE social_accounts VALIDATE CONSTRAINT fk_social_accounts_saved_text;

ALTER TABLE post_destinations ADD COLUMN skip_signature boolean NOT NULL DEFAULT false;

ALTER TABLE post_destinations ADD COLUMN frozen_signature jsonb;

ALTER TABLE approval_request_destinations ADD COLUMN frozen_signature jsonb;

CREATE OR REPLACE FUNCTION trg_dest_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE req_state text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'draft' OR NEW.approval_request_id IS NOT NULL OR NEW.version <> 1 THEN
      RAISE EXCEPTION 'destinations are inserted as unbound drafts at version 1' USING ERRCODE = 'KR001';
    END IF;
    IF app_actor() LIKE 'grant:%' THEN
      UPDATE public.posts SET agent_dirty = true WHERE workspace_id = NEW.workspace_id AND id = NEW.post_id;
    END IF;
    RETURN NEW;
  END IF;

  IF (NEW.workspace_id, NEW.id, NEW.post_id, NEW.social_account_id, NEW.provider)
     IS DISTINCT FROM (OLD.workspace_id, OLD.id, OLD.post_id, OLD.social_account_id, OLD.provider) THEN
    RAISE EXCEPTION 'destination identity is immutable; swap = new row' USING ERRCODE = 'KR005';
  END IF;

  IF NEW.state IS DISTINCT FROM OLD.state THEN
    IF NOT EXISTS (SELECT 1 FROM public.destination_transitions WHERE from_state = OLD.state AND to_state = NEW.state) THEN
      RAISE EXCEPTION 'illegal destination transition % -> %', OLD.state, NEW.state USING ERRCODE = 'KR001';
    END IF;
    IF NEW.version <> OLD.version + 1 THEN
      RAISE EXCEPTION 'state change requires version + 1' USING ERRCODE = 'KR002';
    END IF;
    IF NEW.state = 'scheduled' AND app_actor() LIKE 'grant:%' AND NEW.approval_request_id IS NULL THEN
      RAISE EXCEPTION 'a grant may only schedule an approved destination' USING ERRCODE = 'KR006';
    END IF;
  ELSIF NEW.version NOT IN (OLD.version, OLD.version + 1) THEN
    RAISE EXCEPTION 'version may only advance by 1' USING ERRCODE = 'KR002';
  END IF;

  IF OLD.state = 'published' AND (NEW.frozen_post_version, NEW.content_hash, NEW.settings, NEW.scheduled_at,
       NEW.approval_request_id, NEW.remote_id) IS DISTINCT FROM (OLD.frozen_post_version, OLD.content_hash,
       OLD.settings, OLD.scheduled_at, OLD.approval_request_id, OLD.remote_id) THEN
    RAISE EXCEPTION 'published destinations are immutable' USING ERRCODE = 'KR005';
  END IF;

  -- variant_id -> NULL is allowed: that is the ON DELETE SET NULL action, and the worker reads the snapshot anyway.
  IF OLD.frozen_post_version IS NOT NULL
     AND NEW.frozen_post_version IS NOT DISTINCT FROM OLD.frozen_post_version
     AND (NEW.settings, NEW.publish_type, NEW.delivery_mode, NEW.skip_signature) IS DISTINCT FROM (OLD.settings, OLD.publish_type, OLD.delivery_mode, OLD.skip_signature)
  THEN
    RAISE EXCEPTION 'frozen destination edited without re-freeze' USING ERRCODE = 'KR003';
  END IF;
  IF OLD.frozen_post_version IS NOT NULL AND NEW.frozen_post_version IS NOT DISTINCT FROM OLD.frozen_post_version
     AND NEW.variant_id IS NOT NULL AND NEW.variant_id IS DISTINCT FROM OLD.variant_id THEN
    RAISE EXCEPTION 'frozen destination edited without re-freeze' USING ERRCODE = 'KR003';
  END IF;

  IF NEW.approval_request_id IS NOT NULL AND NEW.approval_request_id IS DISTINCT FROM OLD.approval_request_id THEN
    SELECT state INTO req_state FROM public.approval_requests
     WHERE workspace_id = NEW.workspace_id AND id = NEW.approval_request_id;
    IF req_state IS DISTINCT FROM 'approved' THEN
      RAISE EXCEPTION 'approval request % is %, not approved', NEW.approval_request_id, coalesce(req_state, 'missing')
        USING ERRCODE = 'KR004';
    END IF;
  END IF;

  IF app_actor() LIKE 'grant:%' AND (NEW.settings, NEW.variant_id, NEW.publish_type, NEW.skip_signature)
     IS DISTINCT FROM (OLD.settings, OLD.variant_id, OLD.publish_type, OLD.skip_signature) THEN
    UPDATE public.posts SET agent_dirty = true WHERE workspace_id = NEW.workspace_id AND id = NEW.post_id;
  END IF;
  RETURN NEW;
END $$;
