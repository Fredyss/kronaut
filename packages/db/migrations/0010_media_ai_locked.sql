ALTER TABLE media_assets ADD COLUMN ai_locked boolean NOT NULL DEFAULT false;

UPDATE media_assets m SET ai_locked = true
 WHERE m.ai_generated
   AND (m.uploaded_by_grant_id IS NOT NULL
     OR EXISTS (SELECT 1 FROM audit_events e
                 WHERE e.workspace_id = m.workspace_id AND e.resource_kind = 'media_asset'
                   AND e.resource_id = m.id AND e.action = 'media.ai_marked'
                   AND e.actor_kind = 'grant')
     OR EXISTS (SELECT 1 FROM media_assets d
                 WHERE d.workspace_id = m.workspace_id AND d.duplicate_of_id = m.id
                   AND d.uploaded_by_grant_id IS NOT NULL AND d.ai_generated));

ALTER TABLE media_assets ADD CONSTRAINT ck_media_assets_ai_locked
  CHECK (NOT ai_locked OR ai_generated) NOT VALID;

ALTER TABLE media_assets VALIDATE CONSTRAINT ck_media_assets_ai_locked;
