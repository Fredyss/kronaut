-- A grant changing a destination's delivery mode changes its content hash, so it taints the post like the other fields.
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

  IF app_actor() LIKE 'grant:%'
     AND (NEW.settings, NEW.variant_id, NEW.publish_type, NEW.delivery_mode, NEW.skip_signature)
     IS DISTINCT FROM (OLD.settings, OLD.variant_id, OLD.publish_type, OLD.delivery_mode, OLD.skip_signature) THEN
    UPDATE public.posts SET agent_dirty = true WHERE workspace_id = NEW.workspace_id AND id = NEW.post_id;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION trg_approval_request_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n integer; live_self boolean; allow_self boolean; policy_min smallint; requester uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.state <> 'open' THEN RAISE EXCEPTION 'requests start open' USING ERRCODE = 'KR001'; END IF;
    IF app_actor() LIKE 'user:%' THEN
      IF NEW.requested_by_user_id IS DISTINCT FROM app_actor_id('user') THEN
        RAISE EXCEPTION 'requested_by must be the acting user' USING ERRCODE = 'KR006';
      END IF;
    ELSIF app_actor() LIKE 'grant:%' THEN
      IF NEW.requested_by_grant_id IS DISTINCT FROM app_actor_id('grant') THEN
        RAISE EXCEPTION 'requested_by must be the acting grant' USING ERRCODE = 'KR006';
      END IF;
    ELSE
      RAISE EXCEPTION 'only a user or grant can open an approval request' USING ERRCODE = 'KR006';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.state IS DISTINCT FROM OLD.state THEN
    IF NOT ((OLD.state = 'open' AND NEW.state IN ('approved','rejected','voided','withdrawn'))
         OR (OLD.state = 'approved' AND NEW.state = 'revoked')) THEN
      RAISE EXCEPTION 'illegal approval transition % -> %', OLD.state, NEW.state USING ERRCODE = 'KR001';
    END IF;
    IF NEW.state IN ('approved','rejected','revoked') AND app_actor() !~ '^(user|reviewer):' THEN
      RAISE EXCEPTION 'only a human or reviewer can decide' USING ERRCODE = 'KR006';
    END IF;
    IF NEW.state = 'approved' THEN
      -- The snapshot is caller-written, so it may only narrow the live policy (ADR-0059), and the live approval count is a floor.
      WITH live_brands AS (
        SELECT DISTINCT a.brand_id FROM public.post_destinations d
          JOIN public.social_accounts a ON a.workspace_id = d.workspace_id AND a.id = d.social_account_id
         WHERE d.workspace_id = NEW.workspace_id AND d.post_id = NEW.post_id AND d.state <> 'canceled'
      ), sources AS (
        SELECT brand_id FROM live_brands
        UNION ALL SELECT NULL::uuid WHERE NOT EXISTS (SELECT 1 FROM live_brands)
      )
      SELECT bool_and(coalesce(p.allow_self_approval, false)),
             max(p.required_approvals) FILTER (WHERE p.mode = 'required')
        INTO live_self, policy_min
        FROM sources s
        LEFT JOIN LATERAL (
          SELECT q.mode, q.required_approvals, q.allow_self_approval, q.reschedule_tolerance_min
            FROM public.approval_policies q
           WHERE q.workspace_id = NEW.workspace_id AND (q.brand_id = s.brand_id OR q.brand_id IS NULL)
           ORDER BY q.brand_id NULLS LAST LIMIT 1) p ON true;
      allow_self := coalesce(live_self, false)
                    AND coalesce(NEW.policy_snapshot->'allow_self_approval' = 'true'::jsonb, false);
      -- A key acts for its sponsor, so the sponsor approving the key's request is self-approval.
      requester := coalesce(NEW.requested_by_user_id,
        (SELECT g.sponsor_user_id FROM public.access_grants g
          WHERE g.workspace_id = NEW.workspace_id AND g.id = NEW.requested_by_grant_id));
      SELECT count(*) INTO n FROM public.approval_decisions d
       WHERE d.workspace_id = NEW.workspace_id AND d.request_id = NEW.id AND d.decision = 'approve'
         AND (allow_self OR d.approver_kind = 'reviewer' OR d.user_id IS DISTINCT FROM requester);
      IF n < greatest(NEW.required_approvals, policy_min) THEN
        RAISE EXCEPTION 'request has % of % qualifying approvals', n, greatest(NEW.required_approvals, policy_min)
          USING ERRCODE = 'KR004';
      END IF;
    END IF;
    IF NEW.state = 'revoked' AND EXISTS (SELECT 1 FROM public.post_destinations
        WHERE workspace_id = NEW.workspace_id AND approval_request_id = NEW.id AND state <> 'published') THEN
      RAISE EXCEPTION 'unbind destinations before revoking' USING ERRCODE = 'KR004';
    END IF;
  END IF;
  IF (NEW.post_id, NEW.post_version, NEW.content_hash, NEW.policy_snapshot, NEW.required_approvals,
      NEW.requested_by_user_id, NEW.requested_by_grant_id)
     IS DISTINCT FROM (OLD.post_id, OLD.post_version, OLD.content_hash, OLD.policy_snapshot, OLD.required_approvals,
      OLD.requested_by_user_id, OLD.requested_by_grant_id) THEN
    RAISE EXCEPTION 'approval request content is immutable' USING ERRCODE = 'KR005';
  END IF;
  RETURN NEW;
END $$;

-- Revisions and approval evidence are history: deleting a newer tainted revision would let an identical human
-- revision drop agent authorship (ADR-0012). Cascades from deleting a post still run as the table owner.
REVOKE DELETE ON post_revisions, revision_destinations, approval_request_destinations, approval_decisions
  FROM kronaut_app;
