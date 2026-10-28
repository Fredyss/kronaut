import type { Post } from './api.ts';
import { m } from './i18n.ts';

export function summaryLabel(summary: Post['publishSummary']): string {
  switch (summary) {
    case 'draft':
      return m.post_summary_draft();
    case 'in_review':
      return m.post_summary_in_review();
    case 'scheduled':
      return m.post_summary_scheduled();
    case 'in_progress':
      return m.post_summary_in_progress();
    case 'needs_action':
      return m.post_summary_needs_action();
    case 'completed_all':
      return m.post_summary_completed_all();
    case 'completed_partial':
      return m.post_summary_completed_partial();
    case 'completed_failed':
      return m.post_summary_completed_failed();
    case 'canceled':
      return m.post_summary_canceled();
  }
}
