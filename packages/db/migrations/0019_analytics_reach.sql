ALTER TABLE post_metric_snapshots ADD CONSTRAINT ck_post_metric_snapshots_metric
  CHECK (metric IN ('likes','reposts','replies','quotes','comments','shares',
    'reactions','bookmarks','views','reach')) NOT VALID;

ALTER TABLE post_metric_snapshots VALIDATE CONSTRAINT ck_post_metric_snapshots_metric;

ALTER TABLE post_metric_snapshots DROP CONSTRAINT post_metric_snapshots_metric_check;
