ALTER TABLE approval_requests ADD CONSTRAINT ck_approval_requests_void_reason
  CHECK (void_reason IN ('content_changed','destinations_changed','schedule_changed','policy_changed','post_deleted')) NOT VALID;

ALTER TABLE approval_requests VALIDATE CONSTRAINT ck_approval_requests_void_reason;

ALTER TABLE approval_requests DROP CONSTRAINT approval_requests_void_reason_check;
