ALTER TABLE post_metric_snapshots ADD CONSTRAINT ck_post_metric_snapshots_metric_v2
  CHECK (metric IN ('likes','reposts','replies','quotes','comments','shares',
    'reactions','bookmarks','views','reach','saves','link_clicks')) NOT VALID;

ALTER TABLE post_metric_snapshots VALIDATE CONSTRAINT ck_post_metric_snapshots_metric_v2;

ALTER TABLE post_metric_snapshots DROP CONSTRAINT ck_post_metric_snapshots_metric;
