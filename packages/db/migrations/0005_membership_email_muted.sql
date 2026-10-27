ALTER TABLE memberships ADD COLUMN email_muted text[] NOT NULL DEFAULT '{}';

ALTER TABLE memberships ADD CONSTRAINT ck_memberships_email_muted
  CHECK (email_muted <@ ARRAY['failures','approvals','channels']::text[]) NOT VALID;

ALTER TABLE memberships VALIDATE CONSTRAINT ck_memberships_email_muted;
