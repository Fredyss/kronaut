-- The live floor combines one policy per brand among the post's non-canceled destinations' channels (ADR-0059):
-- each brand's override, else the workspace row; a channel without a brand, or a post without destinations,
-- uses the workspace row. No row means the documented defaults: no self-approval, tolerance 0.
CREATE OR REPLACE FUNCTION trg_approval_request_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n integer; live_self boolean; allow_self boolean; policy_min smallint;
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
      SELECT count(*) INTO n FROM public.approval_decisions d
       WHERE d.workspace_id = NEW.workspace_id AND d.request_id = NEW.id AND d.decision = 'approve'
         AND (allow_self OR d.approver_kind = 'reviewer' OR d.user_id IS DISTINCT FROM NEW.requested_by_user_id);
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

CREATE OR REPLACE FUNCTION trg_approval_dest_tolerance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE policy_tol integer;
BEGIN
  IF NEW.tolerance_min IS NULL THEN RETURN NEW; END IF;
  WITH live_brands AS (
    SELECT DISTINCT a.brand_id FROM public.approval_requests r
      JOIN public.post_destinations d ON d.workspace_id = r.workspace_id AND d.post_id = r.post_id
      JOIN public.social_accounts a ON a.workspace_id = d.workspace_id AND a.id = d.social_account_id
     WHERE r.workspace_id = NEW.workspace_id AND r.id = NEW.request_id AND d.state <> 'canceled'
  ), sources AS (
    SELECT brand_id FROM live_brands
    UNION ALL SELECT NULL::uuid WHERE NOT EXISTS (SELECT 1 FROM live_brands)
  )
  SELECT min(coalesce(p.reschedule_tolerance_min, 0)) INTO policy_tol
    FROM sources s
    LEFT JOIN LATERAL (
      SELECT q.mode, q.required_approvals, q.allow_self_approval, q.reschedule_tolerance_min
        FROM public.approval_policies q
       WHERE q.workspace_id = NEW.workspace_id AND (q.brand_id = s.brand_id OR q.brand_id IS NULL)
       ORDER BY q.brand_id NULLS LAST LIMIT 1) p ON true;
  IF NEW.tolerance_min > coalesce(policy_tol, 0) THEN
    RAISE EXCEPTION 'reschedule tolerance % exceeds the live policy %', NEW.tolerance_min, coalesce(policy_tol, 0)
      USING ERRCODE = 'KR004';
  END IF;
  RETURN NEW;
END $$;
