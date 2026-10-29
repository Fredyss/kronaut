import { m } from '../i18n.ts';
import type { Content } from './contents.ts';
import { isBlank } from './doc.ts';

const ISSUES: Readonly<Record<string, () => string>> = {
  text_too_long: () => m.issue_text_too_long(),
  too_many_links: () => m.issue_too_many_links(),
  too_many_media: () => m.issue_too_many_media(),
  too_few_media: () => m.issue_too_few_media(),
  media_not_allowed: () => m.issue_media_not_allowed(),
  mime_unsupported: () => m.issue_mime_unsupported(),
  file_too_large: () => m.issue_file_too_large(),
  aspect_out_of_range: () => m.issue_aspect_out_of_range(),
  resolution_too_high: () => m.issue_resolution_too_high(),
  frame_rate_too_high: () => m.issue_frame_rate_too_high(),
  image_too_wide: () => m.issue_image_too_wide(),
  image_too_narrow: () => m.issue_image_too_narrow(),
  alt_text_too_long: () => m.issue_alt_text_too_long(),
  alt_text_required: () => m.issue_alt_text_required(),
  in_past: () => m.issue_in_past(),
  invalid_time_zone: () => m.issue_invalid_time_zone(),
  queue_empty: () => m.issue_queue_empty(),
  queue_full: () => m.issue_queue_full(),
  invalid_repeat: () => m.issue_invalid_repeat(),
  post_type_unavailable: () => m.issue_post_type_unavailable(),
  provider_unavailable: () => m.issue_provider_unavailable(),
  not_ready: () => m.issue_not_ready(),
  unknown_post_type: () => m.issue_unknown_post_type(),
  too_large: () => m.issue_too_large(),
};

export function issueMessage(code: string): string {
  const message = Object.hasOwn(ISSUES, code) ? ISSUES[code] : undefined;
  return message === undefined ? m.issue_generic() : message();
}

const DESTINATION_PATH = /(?:^|\.)destinations\.(\d+)(?:\.|$)/;

export function destinationIndex(path: string): number | null {
  const match = DESTINATION_PATH.exec(path);
  return match?.[1] === undefined ? null : Number(match[1]);
}

export function blankItemProblem({ replies, comment }: Content): string | null {
  const blank = replies.findIndex((reply) => isBlank(reply.doc));
  if (blank !== -1) return m.compose_issue_reply_empty({ position: blank + 1 });
  return comment !== null && isBlank(comment.doc) ? m.compose_issue_comment_empty() : null;
}
