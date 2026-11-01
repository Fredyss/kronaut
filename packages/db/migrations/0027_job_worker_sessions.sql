ALTER TABLE worker_heartbeats ADD COLUMN job_session uuid;
ALTER TABLE worker_heartbeats ADD COLUMN job_pool_id text;
