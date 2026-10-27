# Reliability test matrix

Runs against testcontainers Postgres, MSW provider fixtures and a fault-injecting egress dispatcher.

| Test | Expected result |
|---|---|
| `crash_before_public_step` | exactly one post |
| `crash_after_public_send` | unconfirmed or verifying, zero resends |
| `duplicate_job_same_destination` | one provider call |
| `lease_expiry_while_alive` | stale finalize rejected |
| `token_rotation_race_two_processes` | one refresh call |
| `refresh_token_lost_on_crash` | one incident |
| `dst_gap_bratislava`, `dst_overlap`, `tzdata_update_recompute` | correct resolution |
| `provider_429_account`, `provider_429_app_scope` | no attempt counted |
| `near_exhausted_header_backoff` | bucket blocks, no 429 |
| `ambiguous_timeout_verifiable`, `ambiguous_timeout_unverifiable` | — |
| `unparseable_2xx` | ambiguous |
| `dns_failure_never_sent` | retried |
| `revoked_account_mid_queue` | 1 incident, siblings blocked without calls, resume on reauth |
| `app_credentials_rejected` | account not flagged |
| `group_edited_after_schedule` | — |
| `edit_during_publishing` | 409 |
| `edit_after_approval` | — |
| `cancel_before_public_step`, `cancel_after_public_step` | — |
| `thread_crash_after_part_3` | — |
| `ig_container_expired` | — |
| `worker_down_3h` | late vs past-deadline |
| `job_row_deleted` | — |
| `approval_missing_at_time` | — |
| `partial_success_event_once` | — |
| `webhook_resend_same_id` | Standard Webhooks vectors pass |
| `app_clock_skew` | — |
